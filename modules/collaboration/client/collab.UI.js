/**
 * Constructs a client UI binding
 *
 * @class
 * @constructor
 * @param {collab.Client} client Client adapter that the UI is to attached to
**/
collab.UI = function( client ) {
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
 * Bulk add users to the list; Used at the time of connection init
**/
collab.UI.prototype.populateUsersList = function( usersList ) {
	for( u in usersList ) {
		var userName = usersList[ u ];
		$( '#collab-users-list' ).append( '<p id="collab-user-' + userName + 
				'" class="collab-username">' + userName + '</p>' );
	}
};

collab.UI.prototype.userConnect = function( userName ) {
	$( '#collab-users-list' ).append( '<p id="collab-user-' + userName + 
			'" class="collab-username">' + userName + '</p>' );
};

collab.UI.prototype.userDisconnect = function( userName ) {
	$( '#collab-user-' + userName ).remove();
};

/**
 * Append collaboration options to the VE toolbar
**/
collab.UI.prototype.setupToolbar = function( veToolbarNode ) {
	veToolbarNode.append( collab.UI.markup.toolbarButtons );
	var _this = this;
	// Display the panel
	$( '#collab-switch' ).click( function() {
		if( _this.state.panel == false ) {
			$( '.es-base' ).addClass( 'es-base-collapsed' );
			$( '#collab-panel' ).show('fast');
			_this.state.panel = true;
			var userName = mw.config.get( 'wgUserName' );
			var pageName = mw.config.get( 'wgPageName' );
			_this.connect( userName, pageName );
			this.innerHTML = 'Turn-off collaborative editing';
		}
		else {
		// Some pretty-ness
			$( '#collab-panel' ).hide('fast', function() {			
				$( '.es-base' ).removeClass( 'es-base-collapsed' );
				_this.state.panel = false;
			});
			_this.disconnect();
			this.innerHTML = 'Turn-on collaborative editing';
		}
	});
};

/**
 * Setup collaboration panel and attach it to the editor's div
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
}

collab.UI.prototype.connect = function( userName, pageName ) {
	var _this = this;
	console.log( _this.client );
	$( '#collab-status' ).html( '<p>Connecting...</p>' );
	_this.client.connect( userName, pageName, function( res ) {
		if( res.success ) {
			$( '#collab-status' ).html( '<p>Connected.</p>' );
		}
		else {
			$( '#collab-status' ).html( '<p>' + res.message + '</p>' );
		}
	});
};

collab.UI.prototype.disconnect = function() {
	$( '#collab-status' ).html('');
	$( '#collab-users-list' ).html('');
 	this.client.disconnect();
};
