import apiFetch from '@wordpress/api-fetch';
import { useEffect } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';

function renderState( block, state ) {
	block.querySelectorAll( '.q2-survey-choice' ).forEach( ( choice ) => {
		const option = Number( choice.dataset.option );
		const selected = option === state.userVote;
		choice.classList.toggle( 'is-selected', selected );
		choice.setAttribute( 'aria-checked', selected ? 'true' : 'false' );
		const count = choice.querySelector( '[data-count]' );
		if ( count ) {
			count.textContent =
				state.total > 0 ? String( state.counts[ option ] || 0 ) : '';
		}
	} );

	const message = block.querySelector( '.q2-survey-message' );
	if ( message && state.total > 0 ) {
		message.textContent = sprintf(
			/* translators: %d: number of survey votes. */
			_n( '%d vote', '%d votes', state.total, 'q2' ),
			state.total
		);
	}
}

export default function useSurveyRuntime( postId, contentRef, active = true ) {
	useEffect( () => {
		if ( ! active || ! contentRef.current ) {
			return undefined;
		}

		const cleanups = [];
		contentRef.current
			.querySelectorAll( '.q2-survey[data-survey-id]' )
			.forEach( ( block ) => {
				const surveyId = block.dataset.surveyId;
				const voteButton = block.querySelector( '.q2-survey-vote' );
				const message = block.querySelector( '.q2-survey-message' );
				let selected = null;

				const choose = ( event ) => {
					const choice = event.target.closest( '.q2-survey-choice' );
					if ( ! choice ) {
						return;
					}
					selected = Number( choice.dataset.option );
					block
						.querySelectorAll( '.q2-survey-choice' )
						.forEach( ( item ) => {
							const isSelected = item === choice;
							item.classList.toggle( 'is-selected', isSelected );
							item.setAttribute(
								'aria-checked',
								isSelected ? 'true' : 'false'
							);
						} );
					voteButton.disabled = false;
				};

				const vote = async () => {
					if ( null === selected ) {
						return;
					}
					voteButton.disabled = true;
					message.textContent = __( 'Saving vote…', 'q2' );
					try {
						const state = await apiFetch( {
							path: `/q2/v1/surveys/${ postId }/${ surveyId }`,
							method: 'POST',
							data: { option: selected },
						} );
						renderState( block, state );
					} catch ( error ) {
						message.textContent =
							error.message ||
							__( 'The vote could not be saved.', 'q2' );
						voteButton.disabled = false;
					}
				};

				block.addEventListener( 'click', choose );
				voteButton?.addEventListener( 'click', vote );
				cleanups.push( () => {
					block.removeEventListener( 'click', choose );
					voteButton?.removeEventListener( 'click', vote );
				} );

				apiFetch( { path: `/q2/v1/surveys/${ postId }/${ surveyId }` } )
					.then( ( state ) => {
						selected = state.userVote;
						renderState( block, state );
						voteButton.disabled = null === selected;
					} )
					.catch( () => {
						message.textContent = __(
							'Survey results could not be loaded.',
							'q2'
						);
					} );
			} );

		return () => cleanups.forEach( ( cleanup ) => cleanup() );
	}, [ active, contentRef, postId ] );
}
