'use strict';
const Page = require( 'wdio-mediawiki/Page' );

class EditPage extends Page {

	get notices() { return $( '.ve-ui-mwNoticesPopupTool-items' ); }

	openForEditing( title ) {
		super.openTitle( title, { veaction: 'edit', vehidebetadialog: 1, hidewelcomedialog: 1 } );
	}

}
module.exports = new EditPage();
