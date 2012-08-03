/**
 * Constructs a client UI binding
 *
 * @class
 * @constructor
 * @param {collab.Client} client Client adapter that the UI is to attached to
**/
collab.UI = function( client ) {
	ve.EventEmitter.call( this );

	this.client = client;
	var elementNodes = collab.UI.elementNodes;
	this.setupToolbar( $( elementNodes.toolbar) );
	this.setupPanel( $( elementNodes.panel ) );
	// Enabled/Disabled state for UI elements
	this.state = {
		panel: false
	};
};

collab.UI.elementNodes = {
	toolbar: '.es-toolbarGroups',
	panel: '#content'
};

/**
 * Static markup holder to keep all the mess at one place
**/
collab.UI.markup = {
	panel:
		'<div id="collab-panel">' +
			'<div id="collab-status">' +
				//'<p><span>Your username</span></p>' +
				//'<p><input id="collab-username" type="text" class="collab-text-box" size="10"></input></p>' +
				//'<p><button id="collab-connect">Connect</button></p>' +
			'</div>' +
			'<div id="collab-users-list"></div>' +
		'</div>',
	toolbarButtons:
		'<div id="collab-buttons" class="es-toolbarGroup">' +
			'<button id="collab-switch" class="collab-button">Turn-on collaborative editing</button>' +
		'</div>'
};

/**
 * Enable editing by settings contentedible=true
 *
 * @method
**/
collab.UI.prototype.enableEditing = function() {
	var documentNode = this.client.editor.view.documentView.documentNode;
	documentNode.$.attr( 'contenteditable', true );
};

/**
 * Disable editing by setting contenteditable=false
 *
 * @method
**/
collab.UI.prototype.disableEditing = function() {
	var view = this.client.editor.view;
	var documentNode = view.documentView.documentNode;
	documentNode.$.attr( 'contenteditable', false );
};

/**
 * Bulk add users to the list; Used at the time of connection init
 *
 * @method
 * @param{Array} users Array of user objects to add to the users list.
**/
collab.UI.prototype.populateUsersList = function( users ) {
	for( u in users ) {
		var userData = users[ u ];
		this.userConnect( userData );
	}
};

/**
 * Method invoked when a new user connects to the editing session.
 *
 * @method
 * @param{Object} userData User object for the connecting user.
**/
collab.UI.prototype.userConnect = function( userData ) {
	var userName = userData.userName;
	var element =	$( '<p id="collab-user-' + userName + 
			'" class="collab-username">' + userName + '</p>' );

	if( userData.isPublisher === true ) {
		element.addClass( 'collab-publisher' );
	}
	$( '#collab-users-list' ).append( element );
};

collab.UI.prototype.userDisconnect = function( userName ) {
	$( '#collab-user-' + userName ).remove();
};

/**
 * Append collaboration options to the VE toolbar
 *
 * @method
 * @param{String} veToolbarNode Identifier of the toolbar's HTML element.
**/
collab.UI.prototype.setupToolbar = function( veToolbarNode ) {
	var _this = this;
	
	veToolbarNode.append( collab.UI.markup.toolbarButtons );
	// Display the panel
	$( '#collab-switch' ).click( function() {
		if( _this.state.panel == false ) {
			$( '.es-base' ).addClass( 'es-base-collapsed' );
			$( '#collab-panel' ).show( 'fast' );
			_this.state.panel = true;
			var userName = mw.config.get( 'wgUserName' );
			var pageName = mw.config.get( 'wgPageName' );
			_this.connect( userName, pageName );
			this.innerHTML = 'Turn-off collaborative editing';
		}
		else {
			_this.disconnect();
			this.innerHTML = 'Turn-on collaborative editing';
		}
	});
};

/**
 * Setup collaboration panel and attach it to the editor's div
 *
 * @method
 * @param{String} veContainer Identifier of the VE container's HTML element.
**/
collab.UI.prototype.setupPanel = function( veContainer ) {
	var _this = this;

	veContainer.append( collab.UI.markup.panel );
	veContainer.append( '<div class="clearfix" style="clear: both"></div>' );
	$( '#collab-panel' ).hide();

	$( '#collab-connect' ).click( function() {
		var userName = $( '#collab-username' ).val();
		var pageName = 'Main_Page';
		_this.connect( userName, pageName );
	});
};

collab.UI.prototype.setResponseStatus = function( response ) {
	if( response.success ) {
		$( '#collab-status' ).html( '<p>Connected.</p>' );
	}
	else {
		$( '#collab-status' ).html( '<p>' + response.message + '</p>' );
	}
};

/**
 * Initiate connection with the collaboration server from the UI layer.
 *
 * @method
 * @param{String} userName User name to connect as.
 * @param{String} pageName Title of the page to use for editing.
**/
collab.UI.prototype.connect = function( userName, pageName ) {
	var _this = this;

	if( userName ) {
		$( '#collab-status' ).html( '<p>Connecting...</p>' );
		_this.emit( 'connect', { userName: userName, pageName: pageName } );
	}
	else {
		$( '#collab-status' ).html( 'Please login before you can collaborate.' );
	}
};

/**
 * Initiate disonnection from the UI layer.
**/
collab.UI.prototype.disconnect = function() {
	var _this = this; 
	
	// Some pretty-ness
	$( '#collab-panel' ).hide( 'fast', function() {
		$( '.es-base' ).removeClass( 'es-base-collapsed' );
		_this.state.panel = false;
	} );
	$( '#collab-status' ).html( '' );
	$( '#collab-users-list' ).html( '' );

	this.emit( 'disconnect' );
};

ve.extendClass( collab.UI, ve.EventEmitter );
