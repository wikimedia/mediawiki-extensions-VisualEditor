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

	it( 'should insert an internal link', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( '[[' );

		await expect( await EditPage.linkMenu ).toBeDisplayed();

		await EditPage.linkInput.setValue( 'Main_Page' );
		await browser.keys( [ Key.Enter ] );

		await expect( await EditPage.insertedInternalLink ).toBeDisplayed();
	} );

	it( 'should insert an external link', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( '[[' );

		await expect( await EditPage.linkMenu ).toBeDisplayed();

		await EditPage.linkInput.setValue( 'https://mediawiki.org' );
		await browser.keys( [ Key.Enter ] );

		await expect( await EditPage.insertedExternalLink ).toBeDisplayed();
	} );

	it( 'should change text to Page title', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( 'Page title' );

		await browser.keys( [ Key.Control, '1' ] );
		await expect( await EditPage.pageTitle ).toBeDisplayed();
	} );

	it( 'should change text to Heading', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( 'Heading' );

		await browser.keys( [ Key.Control, '2' ] );
		await expect( await EditPage.heading ).toBeDisplayed();
	} );

	it( 'should change text to Sub-heading 1', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( 'Sub-heading 1' );

		await browser.keys( [ Key.Control, '3' ] );
		await expect( await EditPage.subHeadingOne ).toBeDisplayed();
	} );

	it( 'should change text to Sub-heading 2', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( 'Sub-heading 2' );

		await browser.keys( [ Key.Control, '4' ] );
		await expect( await EditPage.subHeadingTwo ).toBeDisplayed();
	} );

	it( 'should change text to Sub-heading 3', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( 'Sub-heading 3' );

		await browser.keys( [ Key.Control, '5' ] );
		await expect( await EditPage.subHeadingThree ).toBeDisplayed();
	} );

	it( 'should change text to Sub-heading 4', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( 'Sub-heading 4' );

		await browser.keys( [ Key.Control, '6' ] );
		await expect( await EditPage.subHeadingFour ).toBeDisplayed();
	} );

	it( 'should change text to Preformatted', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( 'Preformatted' );

		await browser.keys( [ Key.Control, '7' ] );
		await expect( await EditPage.preformatted ).toBeDisplayed();
	} );

	it( 'should change text to Block quote', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await EditPage.veRootNode.setValue( 'Block quote' );

		await browser.keys( [ Key.Control, '8' ] );
		await expect( await EditPage.blockQuote ).toBeDisplayed();
	} );

	it( 'should change formatting to Bold', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await browser.keys( [ Key.Control, 'b' ] );

		await expect( await EditPage.bold ).toBeDisplayed();
	} );

	it( 'should change formatting to Italic', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await browser.keys( [ Key.Control, 'i' ] );

		await expect( await EditPage.italic ).toBeDisplayed();
	} );

	it( 'should change formatting to Superscript', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await browser.keys( [ Key.Control, '.' ] );

		await expect( await EditPage.superscript ).toBeDisplayed();
	} );

	it( 'should change formatting to Subscript', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await browser.keys( [ Key.Control, ',' ] );

		await expect( await EditPage.subscript ).toBeDisplayed();
	} );

	it( 'should change formatting to Computer code', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await browser.keys( [ Key.Control, Key.Shift, '6' ] );

		await expect( await EditPage.code ).toBeDisplayed();
	} );

	it( 'should change formatting to Strikethrough', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await browser.keys( [ Key.Control, Key.Shift, '5' ] );

		await expect( await EditPage.strikethrough ).toBeDisplayed();
	} );

	it( 'should change formatting to Underline', async () => {
		await EditPage.veRootNode.waitForClickable( { timeout: 20000 } );
		await browser.keys( [ Key.Control, 'u' ] );

		await expect( await EditPage.underline ).toBeDisplayed();
	} );

} );
