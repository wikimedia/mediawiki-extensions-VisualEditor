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
	toolbar: '.es-toolbar',
	panel: '#content'
};

/**
 * Static markup holder; Helps to keep all the mess at one place
**/
collab.UI.markup = {
	panel:
		'<div id="collab-panel">' +
			'<p><span>Your username</span></p>' +
			'<p><input id="collab-username" type="text" class="collab-text-box" size="10"></input></p>'+
			'<p><button id="collab-connect">Connect</button></p>' +
			'<div id="collab-users-list"></div>' +
		'</div>',
	toolbarButtons:
		'<div id="collab-buttons" class="es-toolbarGroup">' +
			'<button id="collab-switch">Turn-on collaborative editing</button>' +
		'</div>'
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
		}
		else {
		// Some pretty-ness
			$( '#collab-panel' ).hide('fast', function() {			
				$( '.es-base' ).removeClass( 'es-base-collapsed' );
				_this.state.panel = false;
			});
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
		var username = $( '#collab-username' ).val();
		$( '#collab-panel' ).html( '<p>Connecting...</p>' );
		_this.client.connect( username, function( res ) {
			if( res.success ) {
				$( '#collab-panel' ).html( '<p>Connected.</p>' );
			}
			else {
				$( '#collab-panel' ).html( '<p>' + res.message + '</p>' );
			}
		});
	});
};
