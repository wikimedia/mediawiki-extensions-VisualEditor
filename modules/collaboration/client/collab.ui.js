collab.ui = function( client ) {
	this.client = client;
	var elementNodes = collab.ui.elementNodes;
	this.setupToolbar( $( elementNodes.toolbar) );
	this.setupPanel( $( elementNodes.panel ) );
	
	this.state = {
		panel: false
	};
};

collab.ui.elementNodes = {
	toolbar: '.es-toolbar',
	base: '.es-base'
};

collab.ui.markup = {
	panel:
		'<div id="collab-panel">' +
			'<div id="collab-users-list"></div>' +
		'</div>',
	toolbarButtons:
		'<div id="collab-buttons">' +
			'<button id="collab-switch">Turn-on collaborative editing</button>' +
			'<button id="collab-users-list-btn">Show connected users</button>' +
		'</div>'
};

/**
 * Append collab options to the VE toolbar
**/
collab.ui.prototype.setupToolbar = function( veToolbarNode ) {
	console.log( veToolbarNode );
	veToolbarNode.append( collab.ui.markup.toolbarButtons );
	_this = this;
	// Display the panel
	$( '#collab-switch' ).click( function() {
		if( _this.state.panel == false ) {
			$( '#collab-panel' ).show();
			_this.state.panel = true;
		}
		else {
			$( '#collab-panel' ).hide();
			_this.state.panel = false;
		}
		_this.client.connect();
	});
};

/**
 * Setup collab panel and attach it to the editor's div
**/
collab.ui.prototype.setupPanel = function( veContainer ) {
	veContainer.append( collab.ui.markup.panel );

};
