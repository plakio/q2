import apiFetch from '@wordpress/api-fetch';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import BlockContentEditor, {
	COMMENT_BLOCKS,
} from '../editor/BlockContentEditor';
import { buildCommentTree } from './tree';

function Comment( { comment, childrenMap, onChanged, depth = 0 } ) {
	const [ replying, setReplying ] = useState( false );
	const [ editing, setEditing ] = useState( false );
	const [ deleting, setDeleting ] = useState( false );
	const replies = childrenMap.get( comment.id ) || [];

	const saveReply = async ( content ) => {
		await apiFetch( {
			path: '/q2/v1/comments',
			method: 'POST',
			data: { post: comment.post, parent: comment.id, content },
		} );
		setReplying( false );
		onChanged();
	};

	const saveEdit = async ( content ) => {
		await apiFetch( {
			path: `/q2/v1/comments/${ comment.id }`,
			method: 'PATCH',
			data: { content },
		} );
		setEditing( false );
		onChanged();
	};

	const remove = async () => {
		// eslint-disable-next-line no-alert
		if ( ! window.confirm( __( 'Delete this comment?', 'q2' ) ) ) {
			return;
		}
		setDeleting( true );
		try {
			await apiFetch( {
				path: `/q2/v1/comments/${ comment.id }`,
				method: 'DELETE',
			} );
			onChanged();
		} finally {
			setDeleting( false );
		}
	};

	const date = new Intl.DateTimeFormat( undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	} ).format( new Date( comment.dateGmt ) );

	return (
		<li className="q2-comment" style={ { '--q2-comment-depth': depth } }>
			<article>
				<header>
					<img src={ comment.avatarUrl } alt="" />
					<div>
						<strong>{ comment.authorName }</strong>
						<time dateTime={ comment.dateGmt }>{ date }</time>
					</div>
				</header>
				{ editing ? (
					<BlockContentEditor
						initialContent={ comment.content }
						allowedBlocks={ COMMENT_BLOCKS }
						onSave={ saveEdit }
						onCancel={ () => setEditing( false ) }
						submitLabel={ __( 'Save comment', 'q2' ) }
						compact
					/>
				) : (
					<div
						className="q2-comment-content"
						dangerouslySetInnerHTML={ { __html: comment.rendered } }
					/>
				) }
				{ ! editing && (
					<footer>
						<button
							type="button"
							onClick={ () => setReplying( true ) }
						>
							{ __( 'Reply', 'q2' ) }
						</button>
						{ comment.canEdit && (
							<button
								type="button"
								onClick={ () => setEditing( true ) }
							>
								{ __( 'Edit', 'q2' ) }
							</button>
						) }
						{ comment.canDelete && (
							<button
								type="button"
								onClick={ remove }
								disabled={ deleting }
							>
								{ deleting
									? __( 'Deleting…', 'q2' )
									: __( 'Delete', 'q2' ) }
							</button>
						) }
					</footer>
				) }
				{ replying && (
					<div className="q2-comment-reply-editor">
						<BlockContentEditor
							allowedBlocks={ COMMENT_BLOCKS }
							onSave={ saveReply }
							onCancel={ () => setReplying( false ) }
							submitLabel={ __( 'Reply', 'q2' ) }
							compact
						/>
					</div>
				) }
			</article>
			{ replies.length > 0 && (
				<ul>
					{ replies.map( ( reply ) => (
						<Comment
							key={ reply.id }
							comment={ reply }
							childrenMap={ childrenMap }
							onChanged={ onChanged }
							depth={ depth + 1 }
						/>
					) ) }
				</ul>
			) }
		</li>
	);
}

export default function CommentsThread( { postId, onCountChange } ) {
	const [ comments, setComments ] = useState( [] );
	const [ status, setStatus ] = useState( 'loading' );
	const [ error, setError ] = useState( '' );
	const [ revision, setRevision ] = useState( 0 );
	const childrenMap = useMemo(
		() => buildCommentTree( comments ),
		[ comments ]
	);

	useEffect( () => {
		let active = true;
		setStatus( 'loading' );
		apiFetch( { path: `/q2/v1/comments?post=${ postId }` } )
			.then( ( result ) => {
				if ( active ) {
					setComments( result );
					setStatus( 'ready' );
					onCountChange( result.length );
				}
			} )
			.catch( ( reason ) => {
				if ( active ) {
					setError(
						reason.message ||
							__( 'Comments could not be loaded.', 'q2' )
					);
					setStatus( 'error' );
				}
			} );
		return () => {
			active = false;
		};
	}, [ postId, revision, onCountChange ] );

	const create = async ( content ) => {
		await apiFetch( {
			path: '/q2/v1/comments',
			method: 'POST',
			data: { post: postId, parent: 0, content },
		} );
		setRevision( ( value ) => value + 1 );
	};

	return (
		<section className="q2-comments" aria-label={ __( 'Comments', 'q2' ) }>
			<h3>
				{ sprintf(
					/* translators: %d: comment count. */
					__( 'Discussion (%d)', 'q2' ),
					comments.length
				) }
			</h3>
			{ status === 'loading' && (
				<p>{ __( 'Loading comments…', 'q2' ) }</p>
			) }
			{ status === 'error' && <p role="alert">{ error }</p> }
			{ status === 'ready' && comments.length > 0 && (
				<ul className="q2-comment-list">
					{ ( childrenMap.get( 0 ) || [] ).map( ( item ) => (
						<Comment
							key={ item.id }
							comment={ item }
							childrenMap={ childrenMap }
							onChanged={ () =>
								setRevision( ( value ) => value + 1 )
							}
						/>
					) ) }
				</ul>
			) }
			<div className="q2-new-comment">
				<h4>{ __( 'Add to the discussion', 'q2' ) }</h4>
				<BlockContentEditor
					key={ revision }
					allowedBlocks={ COMMENT_BLOCKS }
					onSave={ create }
					submitLabel={ __( 'Comment', 'q2' ) }
					compact
				/>
			</div>
		</section>
	);
}
