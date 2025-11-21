import EditPage from '../pageobjects/edit.page.js';
import LoginPage from 'wdio-mediawiki/LoginPage';
import * as Util from 'wdio-mediawiki/Util';
import { Key } from 'webdriverio';

describe( 'Content Editable', () => {

	let name, content;

	beforeEach( async () => {
		content = Util.getTestString();
		name = Util.getTestString();
		await LoginPage.loginAdmin();

		await EditPage.openForEditing( name );
		await EditPage.toolbar.waitForDisplayed( { timeout: 20000 } );
	} );

	afterEach( async () => {
		// T269566: Popup with text
		// 'Leave site? Changes that you made may not be saved. Cancel/Leave'
		// appears after the browser tries to leave the page with the preview.
		await browser.reloadSession();
	} );

	it( 'should load when an url is opened @daily', async () => {
		await expect( await EditPage.toolbar ).toBeDisplayed();
	} );

	it( 'should be editable', async () => {
		await EditPage.veRootNode.setValue( content );

		await expect( await EditPage.veRootNode ).toHaveText( content );
	} );

	// Skipped starting 2025-08-14 because of T401573
	it.skip( 'should save an edit', async () => {
		await EditPage.veRootNode.setValue( content );
		await EditPage.savePageDots.click();
		await EditPage.savePage.waitForClickable();
		await EditPage.savePage.click();

		await EditPage.saveComplete();
		await expect( await EditPage.notification ).toHaveText( 'The page has been created.' );
	} );

	it( 'should insert a table', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( '{|' );

		await expect( await EditPage.insertedTable ).toBeDisplayed();
	} );

	it( 'should insert Bullet list', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( '* ' );

		await expect( await EditPage.insertedBulletList ).toBeDisplayed();
	} );

	it( 'should insert Numbered list', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( '1. ' );

		await expect( await EditPage.insertedNumberedList ).toBeDisplayed();
	} );

	it( 'should insert and indent Bullet list', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( '* ' );

		await expect( await EditPage.insertedBulletList ).toBeDisplayed();

		await browser.keys( [ Key.Tab ] );

		await expect( await EditPage.indentedBulletList ).toBeDisplayed();
	} );

	it( 'should insert and indent Numbered list', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( '1. ' );

		await expect( await EditPage.insertedNumberedList ).toBeDisplayed();

		await browser.keys( [ Key.Tab ] );

		await expect( await EditPage.indentedNumberedList ).toBeDisplayed();
	} );

	it( 'should insert an external link', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( '[[' );

		await expect( await EditPage.linkMenu ).toBeDisplayed();

		await EditPage.linkInput.setValue( 'https://mediawiki.org' );
		await browser.keys( [ Key.Enter ] );

		await expect( await EditPage.insertedExternalLink ).toBeDisplayed();
	} );

} );
