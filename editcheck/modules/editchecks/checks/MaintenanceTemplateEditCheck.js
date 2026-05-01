/**
 * Edit check to detect maintenance templates
 *
 * @class
 * @extends mw.editcheck.BaseEditCheck
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.MaintenanceTemplateEditCheck = function MWMaintenanceTemplateEditCheck() {
	// Parent constructor
	mw.editcheck.MaintenanceTemplateEditCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.MaintenanceTemplateEditCheck, mw.editcheck.BaseEditCheck );

/* Static properties */

mw.editcheck.MaintenanceTemplateEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	showAsCheck: false,
	showAsSuggestion: false,
	templates: {}
} );

mw.editcheck.MaintenanceTemplateEditCheck.static.title = 'Maintenance template';

mw.editcheck.MaintenanceTemplateEditCheck.static.description = 'Act on this maintenace template?';

mw.editcheck.MaintenanceTemplateEditCheck.static.name = 'maintenanceTemplate';

mw.editcheck.MaintenanceTemplateEditCheck.static.choices = [
	{
		action: 'delete',
		label: OO.ui.deferMsg( 'visualeditor-contextitemwidget-label-remove' )
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

/* Methods */

/**
 * @inheritdoc
 */
mw.editcheck.MaintenanceTemplateEditCheck.prototype.canBeShown = function ( ...args ) {
	if ( !this.config.templates || Object.keys( this.config.templates ).length === 0 ) {
		// Abandon early here if this is unconfigured, to avoid doing the work
		// of fetching templates in the listener.
		return false;
	}

	return mw.editcheck.ToneCheck.super.prototype.canBeShown.call( this, ...args );
};

mw.editcheck.MaintenanceTemplateEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const documentModel = surfaceModel.getDocument();
	return this.getAddedNodes( documentModel, ve.dm.MWTransclusionNode ).map( ( node ) => {
		const range = node.getOuterRange();
		if ( this.isDismissedRange( range ) ) {
			return null;
		}
		return node.getPartsList().map( ( part ) => {
			if ( part.templatePage ) {
				// part.template varies depending on how it was specified, so normalize via mw.Title
				const title = mw.Title.newFromText( part.templatePage );
				const config = title && this.config.templates[ title.getMainText() ];
				if ( config ) {
					const msgkey = `editcheck-maintenancetemplate-${ title.getMainText() }-description`;
					ve.init.platform.addMessages( { [ msgkey ]: config.message } );
					return new mw.editcheck.EditCheckAction( {
						title: config.title,
						message: ve.deferJQueryMsg( msgkey ),
						fragments: [ surfaceModel.getLinearFragment( range ) ],
						check: this
					} );
				}
			}
			return null;
		} );
	} );
};

mw.editcheck.MaintenanceTemplateEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'delete' ) {
		action.fragments[ 0 ].removeContent();
		action.select( surface, true );
		return;
	}

	// Parent method
	return mw.editcheck.MaintenanceTemplateEditCheck.super.prototype.act.apply( this, arguments );
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.MaintenanceTemplateEditCheck );
