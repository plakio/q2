import {
	BlockEditorProvider,
	BlockList,
	BlockToolbar,
	BlockTools,
	Inserter,
	ObserveTyping,
	WritingFlow,
} from '@wordpress/block-editor';
import { registerCoreBlocks } from '@wordpress/block-library';
import { createBlock, getBlockType, parse, serialize } from '@wordpress/blocks';
import {
	Button,
	Spinner,
	ToolbarGroup,
	ToolbarButton,
} from '@wordpress/components';
import { mediaUpload } from '@wordpress/editor';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { plus, undo as undoIcon, redo as redoIcon } from '@wordpress/icons';
import { serializedContentIsMeaningful } from './content';

export const POST_BLOCKS = [
	'core/paragraph',
	'core/heading',
	'core/list',
	'core/image',
	'core/gallery',
	'core/file',
	'core/quote',
	'core/code',
	'core/embed',
	'q2/task',
	'q2/project-status',
	'q2/changelog',
	'q2/survey',
	'q2/files',
];

export const COMMENT_BLOCKS = [
	'core/paragraph',
	'core/list',
	'core/list-item',
	'core/image',
	'core/quote',
	'core/code',
];

if ( ! getBlockType( 'core/paragraph' ) ) {
	registerCoreBlocks();
}

function initialBlocks( content ) {
	const parsed = content ? parse( content ) : [];
	return parsed.length > 0 ? parsed : [ createBlock( 'core/paragraph' ) ];
}

function arraysEqual( a, b ) {
	if ( a === b ) {
		return true;
	}
	if ( ! a || ! b || a.length !== b.length ) {
		return false;
	}
	for ( let i = 0; i < a.length; i++ ) {
		const left = serialize( a[ i ] );
		const right = serialize( b[ i ] );
		if ( left !== right ) {
			return false;
		}
	}
	return true;
}

export default function BlockContentEditor( {
	initialContent = '',
	allowedBlocks = POST_BLOCKS,
	onSave,
	onCancel,
	onContentChange,
	submitLabel = __( 'Publish', 'q2' ),
	compact = false,
} ) {
	const [ blocks, setBlocks ] = useState( () =>
		initialBlocks( initialContent )
	);
	const [ history, setHistory ] = useState( () => [ blocks ] );
	const [ historyIndex, setHistoryIndex ] = useState( 0 );
	const [ busy, setBusy ] = useState( false );
	const [ message, setMessage ] = useState( '' );
	const lastCommittedRef = useRef( blocks );

	const commitBlocks = useCallback(
		( next ) => {
			setBlocks( ( current ) => {
				if ( arraysEqual( current, next ) ) {
					return current;
				}
				return next;
			} );
			setHistory( ( past ) => {
				const trimmed = past.slice( 0, historyIndex + 1 );
				const last = trimmed[ trimmed.length - 1 ];
				if ( last && arraysEqual( last, next ) ) {
					return past;
				}
				return [ ...trimmed, next ];
			} );
			setHistoryIndex( ( value ) => value + 1 );
		},
		[ historyIndex ]
	);

	const canUndo = historyIndex > 0;
	const canRedo = historyIndex < history.length - 1;

	const undo = useCallback( () => {
		if ( ! canUndo ) {
			return;
		}
		const nextIndex = historyIndex - 1;
		setHistoryIndex( nextIndex );
		setBlocks( history[ nextIndex ] );
		lastCommittedRef.current = history[ nextIndex ];
	}, [ canUndo, history, historyIndex ] );

	const redo = useCallback( () => {
		if ( ! canRedo ) {
			return;
		}
		const nextIndex = historyIndex + 1;
		setHistoryIndex( nextIndex );
		setBlocks( history[ nextIndex ] );
		lastCommittedRef.current = history[ nextIndex ];
	}, [ canRedo, history, historyIndex ] );

	const handleInput = useCallback(
		( next ) => {
			commitBlocks( next );
		},
		[ commitBlocks ]
	);

	const canSave = useMemo(
		() => serializedContentIsMeaningful( serialize( blocks ).trim() ),
		[ blocks ]
	);
	const editorSettings = useMemo(
		() => ( {
			allowedBlockTypes: allowedBlocks,
			hasFixedToolbar: true,
			mediaUpload,
			__experimentalCanUserUseUnfilteredHTML: false,
		} ),
		[ allowedBlocks ]
	);

	useEffect( () => {
		onContentChange?.( canSave );
	}, [ canSave, onContentChange ] );

	const save = async () => {
		if ( ! canSave ) {
			setMessage( __( 'Write something before saving.', 'q2' ) );
			return;
		}
		const content = serialize( blocks ).trim();

		setBusy( true );
		setMessage( '' );
		try {
			await onSave( content );
		} catch ( error ) {
			setMessage(
				error.message || __( 'The content could not be saved.', 'q2' )
			);
		} finally {
			setBusy( false );
		}
	};

	return (
		<div className={ `q2-block-editor${ compact ? ' is-compact' : '' }` }>
			<BlockEditorProvider
				value={ blocks }
				onInput={ handleInput }
				onChange={ handleInput }
				settings={ editorSettings }
			>
				<BlockTools>
					<div className="q2-block-editor-toolbar">
						<Inserter
							renderToggle={ ( { onToggle, disabled } ) => (
								<Button
									icon={ plus }
									label={ __( 'Add block', 'q2' ) }
									onClick={ onToggle }
									disabled={ disabled }
								/>
							) }
						/>
						<ToolbarGroup>
							<ToolbarButton
								icon={ undoIcon }
								label={ __( 'Undo' ) }
								shortcut="Ctrl+Z"
								disabled={ ! canUndo }
								onClick={ undo }
							/>
							<ToolbarButton
								icon={ redoIcon }
								label={ __( 'Redo' ) }
								shortcut="Ctrl+Shift+Z"
								disabled={ ! canRedo }
								onClick={ redo }
							/>
						</ToolbarGroup>
						<div className="q2-block-editor-toolbar-blocks">
							<BlockToolbar hideDragHandle />
						</div>
					</div>
					<div className="q2-block-editor-canvas">
						<WritingFlow>
							<ObserveTyping>
								<BlockList />
							</ObserveTyping>
						</WritingFlow>
					</div>
				</BlockTools>
			</BlockEditorProvider>
			<footer className="q2-editor-actions">
				<span aria-live="polite">
					{ message ||
						( window.q2Settings?.capabilities?.mentionAll
							? __(
									'Mention teammates with @username or @all.',
									'q2'
							  )
							: __(
									'Mention teammates with @username.',
									'q2'
							  ) ) }
				</span>
				<div>
					{ onCancel && (
						<Button
							variant="tertiary"
							onClick={ onCancel }
							disabled={ busy }
						>
							{ __( 'Cancel', 'q2' ) }
						</Button>
					) }
					<Button
						variant="primary"
						onClick={ save }
						disabled={ busy || ! canSave }
					>
						{ busy && <Spinner /> }
						{ busy ? __( 'Saving…', 'q2' ) : submitLabel }
					</Button>
				</div>
			</footer>
		</div>
	);
}
