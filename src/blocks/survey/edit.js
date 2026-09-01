import { useBlockProps } from '@wordpress/block-editor';
import { Button, TextControl } from '@wordpress/components';
import { useEffect } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { plus, trash } from '@wordpress/icons';

function generateSurveyId() {
	if ( typeof window !== 'undefined' && window.crypto?.randomUUID ) {
		return window.crypto.randomUUID().replace( /-/g, '' ).slice( 0, 16 );
	}
	return (
		Date.now().toString( 36 ) + Math.random().toString( 36 ).slice( 2, 10 )
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const { surveyId, question = '', options = [ '', '', '' ] } = attributes;
	const blockProps = useBlockProps( { className: 'q2-survey' } );

	useEffect( () => {
		if ( ! surveyId ) {
			setAttributes( { surveyId: generateSurveyId() } );
		}
	}, [ setAttributes, surveyId ] );

	const updateOption = ( index, value ) => {
		const next = [ ...options ];
		next[ index ] = value;
		setAttributes( { options: next } );
	};

	return (
		<div { ...blockProps } data-survey-id={ surveyId || '' }>
			<TextControl
				label={ __( 'Survey question', 'q2' ) }
				value={ question }
				placeholder={ __( 'What would you like to ask?', 'q2' ) }
				onChange={ ( value ) => setAttributes( { question: value } ) }
			/>
			<div className="q2-survey-options-editor">
				{ options.map( ( option, index ) => (
					<div key={ index } className="q2-survey-option-editor">
						<span className="q2-survey-radio" aria-hidden="true" />
						<TextControl
							aria-label={ sprintf(
								/* translators: %d: survey option number. */
								__( 'Option %d', 'q2' ),
								index + 1
							) }
							value={ option }
							placeholder={ sprintf(
								/* translators: %d: survey option number. */
								__( 'Option %d', 'q2' ),
								index + 1
							) }
							onChange={ ( value ) =>
								updateOption( index, value )
							}
						/>
						{ options.length > 2 && (
							<Button
								icon={ trash }
								label={ __( 'Remove option', 'q2' ) }
								onClick={ () =>
									setAttributes( {
										options: options.filter(
											( _, i ) => i !== index
										),
									} )
								}
							/>
						) }
					</div>
				) ) }
			</div>
			<Button
				icon={ plus }
				variant="secondary"
				onClick={ () =>
					setAttributes( { options: [ ...options, '' ] } )
				}
			>
				{ __( 'Add option', 'q2' ) }
			</Button>
		</div>
	);
}

export function Save( { attributes } ) {
	const { surveyId = '', question = '', options = [] } = attributes;
	const validOptions = options.filter( ( option ) => option.trim() );
	return (
		<div className="q2-survey" data-survey-id={ surveyId }>
			<h3>{ question || __( 'Survey', 'q2' ) }</h3>
			<div
				className="q2-survey-options"
				role="radiogroup"
				aria-label={ question }
			>
				{ validOptions.map( ( option, index ) => (
					<button
						key={ index }
						type="button"
						className="q2-survey-choice"
						data-option={ index }
						role="radio"
						aria-checked="false"
					>
						<span className="q2-survey-radio" aria-hidden="true" />
						<span className="q2-survey-choice-label">
							{ option }
						</span>
						<span
							className="q2-survey-count"
							data-count={ index }
						/>
					</button>
				) ) }
			</div>
			<div className="q2-survey-actions">
				<button type="button" className="q2-survey-vote" disabled>
					{ __( 'Vote', 'q2' ) }
				</button>
				<span className="q2-survey-message" aria-live="polite" />
			</div>
		</div>
	);
}
