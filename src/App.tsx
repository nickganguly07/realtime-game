import React, { Component } from 'react';
import './App.scss';
import firebase from 'firebase';
import { config } from './config';

export default class App extends Component<any, any> {
	private maxLength = 40;
	private allowedStrikes = 3;
	private defaultStrikes = new Array(this.allowedStrikes).fill({ icon: '⚪', guess: '' });
	private isClient = (new URL(window.location.href)).searchParams.get("isClient") !== null;

	constructor(props: any) {
		super(props);

		this.state = {
			letters: Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
			quotes: [], //Filled by the mounted hook
			currentQuote: '', //Filled by the mounted hook
			quoteAuthor: '',
			guesses: [],
			strikes: [ ...this.defaultStrikes ],
			gameOver: false
		};
	}

	componentDidMount() {
		console.log('did mount');
		firebase.initializeApp(config);
		firebase.database().ref('/demo').remove().then(() => {
			fetch('https://type.fit/api/quotes')
				.then((response) => response.json())
				.then((fetchedQuotes) => {
					fetchedQuotes = fetchedQuotes.filter((quote: any) => quote.text.length <= this.maxLength);// Get rid of any quotes that are too long
					this.setState({
						quotes: fetchedQuotes,
					});
					this.pickAQuote();

					if (this.isClient) {
						firebase.database().ref('/demo').on('child_added', (event) => {
							if (event.exists()) {
								console.log(event.val());
								this.guess(event.val().letter);
							}
						});
					}
				});
		});
	}

	private handleKeyPress = (event: any) => {
		const key: string = event.key.toUpperCase()
		if (key.length === 1 && key.match(/[a-zA-Z]/) && !this.state.guesses.includes(key)) {
			console.log(key)
			this.guess(key)
		}
	};

	private pickAQuote = () => {
		console.log(this.state.quotes);
		const random = Math.floor(Math.random() * this.state.quotes.length)
		this.setState({
			currentQuote: this.state.quotes[random].text.toUpperCase(),
			quoteAuthor: this.state.quotes[random].author,
		});
	};

	private isRevealed = (letter: string) => {
		if (!letter.match(/[a-zA-Z\s]/)) {
			return letter
		}
		return this.state.guesses.includes(letter) || this.state.gameOver ? letter : '_'
	};

	private guess = (letter: string) => {
		if (!this.isClient) {
			const key = firebase.database().ref('/demo').push().key;
			firebase.database().ref(`/demo/${ key }`).set({
				letter
			}).then(_ => {
			});

			return;
		}

		console.log(letter);
		this.setState({
			guesses: [ ...this.state.guesses, letter ],
		});
		if (!this.state.currentQuote.includes(letter)) {
			let oldStrikes = this.state.strikes;
			oldStrikes.pop();
			this.setState({
				strikes: [ { icon: '🚫', guess: letter }, ...oldStrikes ],
			});
		}
		if (this.strikeout() || this.puzzleComplete()) {
			this.setState({
				gameOver: true,
			});
		}
	};

	private newGame = async () => {
		const confirmation = window.confirm('End this game and start a new one?')
		if (!confirmation) return

		await firebase.database().ref('/demo').remove();
		this.pickAQuote()
		this.setState({
			guesses: [],
			strikes: [ ...this.defaultStrikes ],
			gameOver: false,
		});
	};

	private splitQuote = () => {
		return this.state.currentQuote.split(' ');
	};
	private badGuesses = () => {
		return this.state.strikes.filter((s: any) => s.guess).map((s: any) => s.guess);
	};
	private strikeout = () => {
		return this.badGuesses().length >= this.allowedStrikes;
	};
	private puzzleComplete = () => {
		return this.unrevealed() === 0;
	};
	private unrevealed = () => {
		return this.state.currentQuote.split('').filter((letter: string) => {
			return letter.match(/[a-zA-Z]/) && !this.state.guesses.includes(letter)
		}).length;
	};
	private message = () => {
		if (!this.state.gameOver) {
			return '☝️ Pick a letter'
		} else if (this.strikeout()) {
			return '❌ You lost this round. Try again?'
		} else if (this.puzzleComplete()) {
			return '🎉 You win!'
		}
		//You can never be too safe ¯\_(ツ)_/¯
		return '😬 Unforeseen error state, maybe try a new game?'
	};

	render() {
		return (
			<main id="app" onKeyUp={ this.handleKeyPress }>
				<div className="container">
					<h3>Simon Realtime Demo</h3>
					{ this.isClient && (
						<>
							<p id="quote"
							   className={ (this.strikeout() ? 'strike ' : '') + (this.puzzleComplete() ? 'highlight' : '') }>
								{ this.splitQuote().map((word: string, index: number) => {
									return (
										<span key={ `word-${ index }` }>
								{ word.split('').map((letter, letterIndex) => {
									return this.isRevealed(letter);
								}) }
							</span>
									);
								}) }
								{ this.state.gameOver && (<small>
									—{ this.state.quoteAuthor }
								</small>) }
							</p>

							<div className="status">
								<h2>Strikes:</h2>
								<ul className="status">
									{ this.state.strikes.map((strike: any, index: number) => (
										<li key={ `strike-${ index }` }>{ strike.icon }</li>
									)) }
								</ul>
							</div>
						</>
					) }

					{ !this.isClient && (
						<div id="button-board">
							{ this.state.letters.map((letter: string, index: number) => (
								<button
									className={ (this.badGuesses().includes(letter) ? 'strike ' : '') + (this.state.guesses.includes(letter) ? 'highlight' : '') }
									disabled={ this.state.guesses.includes(letter) || this.state.gameOver }
									onClick={ event => this.guess(letter) } key={ `button-${ index }` }>
								<span
									className={ 'letter ' + this.state.guesses.includes(letter) ? 'riser' : '' }>{ letter }</span>
									<span className="background"></span>
								</button>
							)) }
						</div>
					) }

					{ this.isClient && (
						<>
							<div className="status">
								<p>{ this.message() }</p>
							</div>

							<button id="new-game" className={ this.state.gameOver ? 'highlight' : '' }
									onClick={ event => this.newGame() }>New
								game
							</button>
						</>
					) }
				</div>
			</main>
		);
	}
}
