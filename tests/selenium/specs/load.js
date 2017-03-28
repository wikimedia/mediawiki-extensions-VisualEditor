'use strict';
const assert = require( 'assert' );
const EditPage = require( '../pageobjects/edit.page' );
const Util = require( 'wdio-mediawiki/Util' );
const LoginPage = require( 'wdio-mediawiki/LoginPage' );

describe( 'VisualEditor', function () {

	it( 'should load when an url is opened', function () {
		LoginPage.loginAdmin();
		const name = Util.getTestString();

		EditPage.openForEditing( name );

		EditPage.notices.waitForDisplayed();
		assert( EditPage.notices.isDisplayed() );

	} );

} );
