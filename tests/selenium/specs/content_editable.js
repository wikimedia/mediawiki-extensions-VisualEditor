'use strict';
const assert = require( 'assert' );
const EditPage = require( '../pageobjects/edit.page' );
const Util = require( 'wdio-mediawiki/Util' );
const LoginPage = require( 'wdio-mediawiki/LoginPage' );

describe( 'Content Editable', function () {

	it( 'should load when an url is opened', async function () {
		await LoginPage.loginAdmin();
		const name = Util.getTestString();

		await EditPage.openForEditing( name );

		await EditPage.notices.waitForDisplayed();
		assert( await EditPage.notices.isDisplayed() );

	} );

} );
