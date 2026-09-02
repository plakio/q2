import {
	BlockEditorProvider,
	BlockList,
	BlockNavigationDropdown,
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
	DropdownMenu,
	Popover,
	ToolbarGroup,
	ToolbarButton,
} from '@wordpress/components';
import { mediaUpload } from '@wordpress/editor';
import '@wordpress/format-library';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import {
	cog,
	fullscreen as fullscreenIcon,
	info,
	moreVertical,
	plus,
	redo as redoIcon,
	undo as undoIcon,
} from '@wordpress/icons';
import { serializedContentIsMeaningful } from './content';
import useBlockHistory from './useBlockHistory';

export const POST_BLOCKS = [
	'core/paragraph',
	'core/heading',
	'core/list',
	'core/list-item',
	'core/image',
	'core/gallery',
	'core/file',
	'core/quote',
	'core/code',
	'core/embed',
	'q2/task',
	'q2/task-list',
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

export function initialBlocks( content ) {
	const parsed = content ? parse( content ) : [];
	return parsed.length > 0 ? parsed : [ createBlock( 'core/paragraph' ) ];
}

export function useEditorSettings( allowedBlocks ) {
	return useMemo(
		() => ( {
			allowedBlockTypes: allowedBlocks,
			hasFixedToolbar: true,
			mediaUpload,
			__experimentalCanUserUseUnfilteredHTML: false,
		} ),
		[ allowedBlocks ]
	);
}

export default function BlockContentEditor( {
	initialContent = '',
	allowedBlocks = POST_BLOCKS,
	onSave,
	onCancel,
	onContentChange,
	submitLabel = __( 'Publish', 'q2' ),
	compact = false,
	toolbarAfter = null,
	beforeCanvas = null,
	variant = 'default',
	settingsChildren = null,
	statusText = null,
	hasSettings = null,
	onOpenFullEditor = null,
} ) {
	const showSettings = hasSettings ?? Boolean( settingsChildren );
	const { blocks, commitBlocks, undo, redo, canUndo, canRedo } =
		useBlockHistory( () => initialBlocks( initialContent ) );

	const handleInput = useCallback(
		( next ) => commitBlocks( next ),
		[ commitBlocks ]
	);

	const canSave = useMemo(
		() => serializedContentIsMeaningful( serialize( blocks ).trim() ),
		[ blocks ]
	);
	const editorSettings = useEditorSettings( allowedBlocks );

	useEffect( () => {
		onContentChange?.( canSave );
	}, [ canSave, onContentChange ] );

	const save = async () => {
		if ( ! canSave ) {
			return;
		}
		await onSave( serialize( blocks ).trim() );
	};

	if ( 'p2' === variant ) {
		return (
			<P2Layout
				blocks={ blocks }
				handleInput={ handleInput }
				editorSettings={ editorSettings }
				undo={ undo }
				redo={ redo }
				canUndo={ canUndo }
				canRedo={ canRedo }
				canSave={ canSave }
				save={ save }
				onCancel={ onCancel }
				submitLabel={ submitLabel }
				settingsChildren={ settingsChildren }
				statusText={ statusText }
				showSettings={ showSettings }
				onOpenFullEditor={ onOpenFullEditor }
			/>
		);
	}

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
						{ toolbarAfter }
					</div>
					{ beforeCanvas }
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
					{ window.q2Settings?.capabilities?.mentionAll
						? __(
								'Mention teammates with @username or @all.',
								'q2'
						  )
						: __( 'Mention teammates with @username.', 'q2' ) }
				</span>
				<div>
					{ onCancel && (
						<Button variant="tertiary" onClick={ onCancel }>
							{ __( 'Cancel', 'q2' ) }
						</Button>
					) }
					<Button
						variant="primary"
						onClick={ save }
						disabled={ ! canSave }
					>
						{ submitLabel }
					</Button>
				</div>
			</footer>
		</div>
	);
}

function P2Layout( {
	blocks,
	handleInput,
	editorSettings,
	undo,
	redo,
	canUndo,
	canRedo,
	canSave,
	save,
	onCancel,
	submitLabel,
	settingsChildren,
	statusText,
	showSettings = true,
	onOpenFullEditor = null,
} ) {
	const [ settingsOpen, setSettingsOpen ] = useState( false );
	const [ displayOpen, setDisplayOpen ] = useState( false );
	const [ infoOpen, setInfoOpen ] = useState( false );

	return (
		<div className="q2-p2-editor">
			<BlockEditorProvider
				value={ blocks }
				onInput={ handleInput }
				onChange={ handleInput }
				settings={ editorSettings }
			>
				<AutoSelectFirstBlock blocks={ blocks } />
				<BlockTools>
					<header className="q2-p2-toolbar">
						<div className="q2-p2-toolbar-left">
							<Inserter
								position="bottom left"
								renderToggle={ ( {
									onToggle,
									disabled,
									isOpen,
								} ) => (
									<button
										type="button"
										className={ `q2-p2-toolbar-button is-inserter${
											isOpen ? ' is-active' : ''
										}` }
										disabled={ disabled }
										onClick={ onToggle }
										aria-label={ __( 'Add block', 'q2' ) }
									>
										<svg
											width="24"
											height="24"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<rect
												width="24"
												height="24"
												rx="2"
												fill="#0267ff"
											/>
											<path
												d="M11 6h2v10h-2z M6 11h10v2H6z"
												fill="#fff"
											/>
										</svg>
									</button>
								) }
							/>
							<div className="q2-p2-toolbar-history">
								<ToolbarGroup>
									<ToolbarButton
										icon={ undoIcon }
										label={ __( 'Undo', 'q2' ) }
										disabled={ ! canUndo }
										onClick={ undo }
									/>
									<ToolbarButton
										icon={ redoIcon }
										label={ __( 'Redo', 'q2' ) }
										disabled={ ! canRedo }
										onClick={ redo }
									/>
								</ToolbarGroup>
							</div>
							<div className="q2-p2-toolbar-list">
								<BlockNavigationDropdown isDisabled={ false } />
							</div>
							<div className="q2-p2-toolbar-block">
								<BlockToolbar hideDragHandle />
							</div>
							<button
								type="button"
								className={ `q2-p2-toolbar-button${
									infoOpen ? ' is-active' : ''
								}` }
								aria-label={ __( 'Block info', 'q2' ) }
								aria-expanded={ infoOpen }
								onClick={ () => setInfoOpen( ( v ) => ! v ) }
							>
								{ info }
							</button>
							{ infoOpen && (
								<Popover
									position="bottom left"
									onClose={ () => setInfoOpen( false ) }
								>
									<div className="q2-p2-info-popover">
										<strong>
											{ __( 'Write in blocks', 'q2' ) }
										</strong>
										<p>
											{ __(
												'Type / to insert a block. Use the + button to browse available blocks.',
												'q2'
											) }
										</p>
									</div>
								</Popover>
							) }
						</div>
						{ showSettings && (
							<div className="q2-p2-toolbar-right">
								{ onOpenFullEditor && (
									<button
										type="button"
										className="q2-p2-toolbar-button"
										aria-label={ __(
											'Open full editor',
											'q2'
										) }
										title={ __( 'Open full editor', 'q2' ) }
										onClick={ () =>
											onOpenFullEditor(
												serialize( blocks ).trim()
											)
										}
									>
										{ fullscreenIcon }
									</button>
								) }
								<button
									type="button"
									className={ `q2-p2-toolbar-button${
										settingsOpen ? ' is-active' : ''
									}` }
									aria-label={ __( 'Settings', 'q2' ) }
									aria-expanded={ settingsOpen }
									onClick={ () =>
										setSettingsOpen( ( v ) => ! v )
									}
								>
									{ cog }
								</button>
								<DropdownMenu
									icon={ moreVertical }
									label={ __( 'More options', 'q2' ) }
									popoverProps={ {
										position: 'bottom right',
									} }
									toggles={ [
										{
											title: __(
												'Toggle screen settings',
												'q2'
											),
											isActive: displayOpen,
											onClick: () =>
												setDisplayOpen( ( v ) => ! v ),
										},
									] }
								/>
							</div>
						) }
					</header>
					<div className="q2-p2-editor-body">
						<div className="q2-p2-editor-main">
							<div className="q2-p2-canvas">
								<WritingFlow>
									<ObserveTyping>
										<BlockList />
									</ObserveTyping>
								</WritingFlow>
							</div>
							{ showSettings && (
								<div className="q2-p2-display-options">
									<button
										type="button"
										className="q2-p2-display-options-toggle"
										aria-expanded={ displayOpen }
										onClick={ () =>
											setDisplayOpen( ( v ) => ! v )
										}
									>
										<span>
											{ __( 'Display options', 'q2' ) }
										</span>
										<span aria-hidden="true">
											{ displayOpen ? '▴' : '▾' }
										</span>
									</button>
								</div>
							) }
							{ showSettings && displayOpen && (
								<div className="q2-p2-display-options-body">
									{ settingsChildren }
								</div>
							) }
						</div>
						{ showSettings && settingsOpen && (
							<aside className="q2-p2-settings-sidebar">
								{ settingsChildren }
							</aside>
						) }
					</div>
					<div className="q2-p2-footer">
						{ statusText && (
							<span className="q2-p2-status" aria-live="polite">
								{ statusText }
							</span>
						) }
						<div className="q2-p2-actions">
							{ onCancel && (
								<Button variant="tertiary" onClick={ onCancel }>
									{ __( 'Cancel', 'q2' ) }
								</Button>
							) }
							<Button
								variant="primary"
								onClick={ save }
								disabled={ ! canSave }
							>
								{ submitLabel }
							</Button>
						</div>
					</div>
				</BlockTools>
			</BlockEditorProvider>
		</div>
	);
}

function AutoSelectFirstBlock( { blocks } ) {
	const { selectBlock } = useDispatch( 'core/block-editor' );

	useEffect( () => {
		const first = blocks?.[ 0 ];
		if ( ! first ) {
			return undefined;
		}
		const timer = window.setTimeout( () => {
			selectBlock( first.clientId );
		}, 0 );
		return () => window.clearTimeout( timer );
	}, [ blocks, selectBlock ] );

	return null;
}
