import React, { useEffect, useState } from 'react';
import './App.scss';
import firebase from 'firebase';
import { config } from './config';

export const App = (props: any) => {
	const maxLength = 40; // (Typically, the lower this number, the harder the puzzle.)

	const allowedStrikes = 3; //If you set this and maxLength both too high, the puzzle will be impossible to lose.

	const defaultStrikes = new Array(allowedStrikes).fill({ icon: '⚪', guess: '' });

	const url = new URL(window.location.href);
	const isClient = url.searchParams.get("isClient") !== null;

	const [ letters, setLetters ] = useState<Array<any>>(Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'));
	const [ quotes, setQuotes ] = useState<Array<any>>([]);
	const [ guesses, setGuesses ] = useState<Array<string>>([]);
	const [ strikes, setStrikes ] = useState<Array<any>>([ ...defaultStrikes ]);
	const [ gameOver, setGameOver ] = useState<boolean>(false);
	const [ currentQuote, setCurrentQuote ] = useState<string>('');
	const [ quoteAuthor, setQuoteAuthor ] = useState<string>('');

	useEffect(() => {
		firebase.initializeApp(config);

		fetch('https://type.fit/api/quotes')
			.then((response) => response.json())
			.then((fetchedQuotes) => {
				fetchedQuotes = fetchedQuotes.filter((quote: any) => quote.text.length <= maxLength);// Get rid of any quotes that are too long
				setQuotes(fetchedQuotes);
				pickAQuote(fetchedQuotes);

				// const url = new URL(window.location.href);
				// if (url.searchParams.get("isClient") !== null) {
				// 	firebase.database().ref('/demo').on('child_added', (event) => {
				// 		if (event.exists()) {
				// 			console.log(event.val());
				// 			guess(event.val().letter);
				// 		}
				// 	});
				// }
			});
	}, []);


	const handleKeyPress = (event: any) => {
		const key: string = event.key.toUpperCase()
		if (key.length === 1 && key.match(/[a-zA-Z]/) && !guesses.includes(key)) {
			console.log(key)
			guess(key)
		}
	};

	const pickAQuote = (fetchedQuotes: Array<any> = []) => {
		console.log(quotes);
		let qu = quotes;
		if (!quotes.length) {
			qu = fetchedQuotes;
		}
		const random = Math.floor(Math.random() * qu.length)
		setCurrentQuote(qu[random].text.toUpperCase());
		setQuoteAuthor(qu[random].author);
	};

	const isRevealed = (letter: string) => {
		if (!letter.match(/[a-zA-Z\s]/)) {
			return letter
		}
		return guesses.includes(letter) || gameOver ? letter : '_'
	};

	const guess = (letter: string) => {
		// const url = new URL(window.location.href);
		// if (url.searchParams.get("isClient") === null) {
		// 	const key = firebase.database().ref('/demo').push().key;
		// 	firebase.database().ref(`/demo/${ key }`).set({
		// 		letter
		// 	}).then(_ => {
		// 	});
		// } else {
		console.log(letter);
		setGuesses([ ...guesses, letter ]);
		if (!currentQuote.includes(letter)) {
			let oldStrikes = strikes;
			oldStrikes.pop();
			setStrikes([ { icon: '🚫', guess: letter }, ...oldStrikes ]);
		}
		if (strikeout() || puzzleComplete()) {
			setGameOver(true);
			// if (puzzleComplete()) fireEmAll();
		}
		// }
	};

	const newGame = () => {
		const confirmation = window.confirm('End this game and start a new one?')
		if (!confirmation) return
		pickAQuote()
		setGuesses([]);
		setStrikes([ ...defaultStrikes ]);
		setGameOver(false);
	};

	const splitQuote = () => {
		return currentQuote.split(' ')
	};
	const badGuesses = () => {
		return strikes.filter(s => s.guess).map(s => s.guess)
	};
	const strikeout = () => {
		return badGuesses().length >= allowedStrikes
	};
	const puzzleComplete = () => {
		return unrevealed() === 0;
	};
	const unrevealed = () => {
		return [ ...currentQuote ].filter(letter => {
			return letter.match(/[a-zA-Z]/) && !guesses.includes(letter)
		}).length
	};
	const message = () => {
		if (!gameOver) {
			return '☝️ Pick a letter'
		} else if (strikeout()) {
			return '❌ You lost this round. Try again?'
		} else if (puzzleComplete()) {
			return '🎉 You win!'
		}
		//You can never be too safe ¯\_(ツ)_/¯
		return '😬 Unforeseen error state, maybe try a new game?'
	};

	return (
		<main id="app" onKeyUp={ handleKeyPress }>
			<div className="container">
				<h3>Simon Realtime Demo</h3>
				<p id="quote" className={ (strikeout() ? 'strike ' : '') + (puzzleComplete() ? 'highlight' : '') }>
					{ splitQuote().map((word, index) => {
						return (
							<span key={ `word-${ index }` }>
								{ word.split('').map((letter, letterIndex) => {
									return isRevealed(letter);
								}) }
							</span>
						);
					}) }
					{ gameOver && (<small>
						—{ quoteAuthor }
					</small>) }
				</p>

				<div className="status">
					<h2>Strikes:</h2>
					<ul className="status">
						{ strikes.map((strike, index) => (
							<li key={ `strike-${ index }` }>{ strike.icon }</li>
						)) }
					</ul>
				</div>

				<div id="button-board">
					{ letters.map((letter, index) => (
						<button
							className={ (badGuesses().includes(letter) ? 'strike ' : '') + (guesses.includes(letter) ? 'highlight' : '') }
							disabled={ guesses.includes(letter) || gameOver }
							onClick={ event => guess(letter) } key={ `button-${ index }` }>
								<span
									className={ 'letter ' + guesses.includes(letter) ? 'riser' : '' }>{ letter }</span>
							<span className="background"></span>
						</button>
					)) }
				</div>

				<div className="status">
					<p>{ message() }</p>
				</div>

				<button id="new-game" className={ gameOver ? 'highlight' : '' } onClick={ event => newGame() }>New
					game
				</button>
			</div>
		</main>
	);
};
