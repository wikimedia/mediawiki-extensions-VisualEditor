Given(/^I go to the "(.*?)" page which has a media image$/) do |page_title|
  wikitext = '[[File:2012-07-18 Market Street - San Francisco.webm|thumb]]'
  step "I go to the \"#{page_title}\" page with source content \"#{wikitext}\""
end

Given(/^I select the image in VisualEditor$/) do
  step 'I click in the editable part'
  on(VisualEditorPage).media_image_element.when_present.click
end

Given(/^I go to "(.+)" page which has references$/) do |page_title|
  wikitext = 'VisualEditor is a MediaWiki extension.<ref>[http://www.mediawiki.org/wiki/Extension:VisualEditor Extension:VisualEditor]</ref>'
  on(APIPage).create page_title, wikitext
  step "I go to the #{page_title} page for screenshot"
  step 'I click in the editable part'
end

Given(/^I go to the "(.*?)" page with source content "(.*?)"$/) do |page_title, page_content|
  on(APIPage).create page_title, page_content
  step "I go to the #{page_title} page for screenshot"
end

Given(/^I go to the (.*?) page for screenshot$/) do |page_name|
  step "I am on the #{page_name} page"
  @browser.goto "#{@browser.url}&uselang=#{ENV['LANGUAGE_SCREENSHOT_CODE']}"
end

Given(/^I am editing the language screenshots page$/) do
  step 'I go to the "Language Screenshot" page with source content "Language Screenshot"'
  step 'I click in the editable part'
end

Given(/^I edit language screenshot page with (.+)$/) do |content|
  step 'I am editing the language screenshots page'
  step "I edit the page with #{content}"
end

Given(/^I select an image by searching (.+) in Media option$/) do |_content|
  step 'I click in the editable part'
  step 'I click Media'
  step 'I enter San Francisco into media Search box'
  step 'I select an Image'
end

Given(/^I enter "(.*?)" in alternative text$/) do |content|
  on(VisualEditorPage).media_alternative_text_element.when_present.send_keys content
end

Given(/^I go to "(.*?)" page containing math formula/) do |page_title|
  step "I go to the \"#{page_title}\" page with source content \"<math>2+2</math>\""
end

When(/^I click on the Insert menu$/) do
  on(VisualEditorPage).insert_indicator_down_element.when_present.click
end

When(/^I click on the Special character option in Insert menu$/) do
  step 'I click on the Insert menu'
  step 'I click on More in the pull-down menu'
  on(VisualEditorPage).special_character_element.when_present.click
end

When(/^I click on list and indentation dropdown$/) do
  on(VisualEditorPage).bullet_number_selector_element.when_present.click
end

When(/^I click on Page settings option$/) do
  Screenshot.highlight(@current_page, @current_page.page_settings_item_element)
  Screenshot.capture(
    @browser,
    "VisualEditor_page_settings_item-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.hamburger_menu_element, @current_page.page_option_menu_element],
    3
  )

  on(VisualEditorPage).page_settings_element.when_present.click
end

When(/^^I enter "(.*?)" in caption text box$/) do |content|
  on(VisualEditorPage).content_box_element.when_present(2).send_keys content
end

When(/^I click on Advanced Settings tab$/) do
  on(VisualEditorPage).media_advanced_settings_element.when_present.click
end

When(/^I click on Cite menu$/) do
  on(VisualEditorPage).cite_indicator_down_element.when_present.click
end

When(/^I send right arrow times (\d+)$/) do |number|
  number.to_i.times do
    on(VisualEditorPage).content_element.send_keys :arrow_right
    on(VisualEditorPage).content_element.fire_event('onblur') # gerrit 86800/86801
  end
end

When(/^I click on Basic Reference in Cite menu dropdown$/) do
  on(VisualEditorPage).basic_reference_element.when_present.click
end

When(/^I click on category in hamburger menu$/) do
  step 'I click the hamburger menu'

  Screenshot.highlight(@current_page, @current_page.category_item_element)
  Screenshot.capture(
    @browser,
    "VisualEditor_category_item-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.hamburger_menu_element, @current_page.page_option_menu_element],
    3
  )

  on(VisualEditorPage).category_link_element.when_present.click
end

When(/^I click on Formula option in Insert menu$/) do
  step 'I click on the Insert menu'
  step 'I click on More in the pull-down menu'
  on(VisualEditorPage).formula_link_element.when_present.click
end

When(/^I type a formula$/) do
  on(VisualEditorPage).formula_area_element.when_present.send_keys '2+2'
end

When(/^I go to random page for screenshot$/) do
  step 'I am at a random page'
  @browser.goto "#{@browser.url}?setlang=#{ENV['LANGUAGE_SCREENSHOT_CODE']}"
end

When(/^I click on References list in Insert menu$/) do
  step 'I click in the editable part'
  step 'I click on the Insert menu'
  step 'I click on More in the pull-down menu'
  on(VisualEditorPage).ve_references_element.when_present.click
end

Then(/^I should see category dialog box$/) do
  on(VisualEditorPage).window_frame_element.when_present.should be_visible
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.window_frame_element],
    3
  )
end

Then(/^I should see Headings pull-down menu$/) do
  on(VisualEditorPage).heading_dropdown_menus_element.when_present.should be_visible
  step 'I take screenshot of Headings pull-down menu'
end

Then(/^I take screenshot of Headings pull-down menu$/) do
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.format_indicator_element, @current_page.heading_dropdown_menus_element],
    3
  )
end

Then(/^I should see Formatting pull-down menu$/) do
  on(VisualEditorPage).formatting_option_menus_element.when_present.should be_visible
  step 'I take screenshot of Formatting pull-down menu'
end

Then(/^I take screenshot of Formatting pull-down menu$/) do
  step 'I click on More in the pull-down menu'
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.ve_text_style_button_element, @current_page.formatting_option_menus_element],
    3
  )
end

Then(/^I should see pull-down menu containing Page Settings$/) do
  on(VisualEditorPage).page_settings_element.when_present.should be_visible
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.disabled_save_button_element, @current_page.page_option_menu_element],
    3
  )
end

Then(/^I should see Insert pull-down menu$/) do
  on(VisualEditorPage).insert_pull_down_element.when_present.should be_visible
  step 'I take screenshot of insert pull-down menu'
end

Then(/^I take screenshot of insert pull-down menu$/) do
  step 'I click on More in the pull-down menu'
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.insert_button_element, @current_page.insert_pull_down_element],
    3
  )

  Screenshot.highlight(@current_page, @current_page.media_insert_menu_element)

  Screenshot.capture(
    @browser,
    "VisualEditor_Media_Insert_Menu-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.insert_button_element, @current_page.insert_pull_down_element],
    3
  )

  Screenshot.highlight(@current_page, @current_page.media_insert_menu_element, '#FFFFFF')
  Screenshot.highlight(@current_page, @current_page.template_insert_menu_element)

  Screenshot.capture(
    @browser,
    "VisualEditor_Template_Insert_Menu-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.insert_button_element, @current_page.insert_pull_down_element],
    3
  )

  Screenshot.highlight(@current_page, @current_page.template_insert_menu_element, '#FFFFFF')
  Screenshot.highlight(@current_page, @current_page.ref_list_insert_menu_element)

  Screenshot.capture(
    @browser,
    "VisualEditor_References_List_Insert_Menu-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.insert_button_element, @current_page.insert_pull_down_element],
    3
  )

  Screenshot.highlight(@current_page, @current_page.ref_list_insert_menu_element, '#FFFFFF')
  Screenshot.highlight(@current_page, @current_page.formula_insert_menu_element)

  Screenshot.capture(
    @browser,
    "VisualEditor_Formula_Insert_Menu-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.insert_button_element, @current_page.insert_pull_down_element],
    3
  )
end

Then(/^I click on More in the pull-down menu$/) do
  on(VisualEditorPage).more_fewer_element.when_present.click
end

Then(/^I should see Special character Insertion window$/) do
  on(VisualEditorPage).window_frame_element.when_present.should be_visible

  Screenshot.zoom_browser(@browser, -2)
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.toolbar_element, @current_page.window_frame_element]
  )
end

Then(/^I should see save changes dialog box$/) do
  on(VisualEditorPage).window_frame_element.when_present.should be_visible
  Screenshot.zoom_browser(@browser, -2)
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.window_frame_element],
    3
  )
end

Then(/^I should see Page settings dialog box$/) do
  on(VisualEditorPage).window_frame_element.when_present.should be_visible

  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.window_frame_element],
    3
  )

  Screenshot.capture(
    @browser,
    "VisualEditor_Page_Settings_Redirects-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.enable_redirect_element, @current_page.prevent_redirect_element],
    3
  )

  Screenshot.capture(
    @browser,
    "VisualEditor_Page_Settings_TOC-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.table_of_contents_element],
    3
  )

  Screenshot.capture(
    @browser,
    "VisualEditor_Page_Settings_Edit_Links-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.page_settings_editlinks_element],
    3
  )

  Screenshot.zoom_browser(@browser, 3)
  Screenshot.capture(
    @browser,
    "VisualEditor_Apply_Changes-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.settings_apply_button_element]
  )
end

Then(/^I should see list and indentation dropdown$/) do
  on(VisualEditorPage).indentation_pull_down_element.when_present.should be_visible
  Screenshot.zoom_browser(@browser, 3)
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.indentation_button_element, @current_page.indentation_pull_down_element],
    3
  )
end

Then(/^I should see link Content box with dropdown options$/) do
  on(VisualEditorPage).link_list_element.when_present(5).should be_visible

  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.link_list_element, @current_page.window_frame_element, @current_page.new_link_element]
  )
end

Then(/^I should see link icon$/) do
  on(VisualEditorPage).popup_icon_element.when_present(5).should be_visible
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.popup_icon_element, @current_page.internal_link_element]
  )
end

Then(/^I should see media editing dialog box$/) do
  on(VisualEditorPage).window_frame_element.when_present.should be_visible
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.window_frame_element]
  )
end

Then(/^I should see media caption dialog box$/) do
  on(VisualEditorPage).window_frame_element.when_present.should be_visible

  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.window_frame_element]
  )

  Screenshot.capture(
    @browser,
    "VisualEditor_Media_alternative_text-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.media_alternative_block_element]
  )
end

Then(/^I should see media advanced settings dialog box$/) do
  on(VisualEditorPage).window_frame_element.when_present.should be_visible

  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.window_frame_element]
  )
end

Then(/^I should see media in VisualEditor$/) do
  on(VisualEditorPage).media_image_element.when_present.should be_visible
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.media_image_element, @current_page.media_caption_element]
  )
end

Then(/^I should see the Cite button$/) do
  on(VisualEditorPage).cite_button_element.when_present.should be_visible
  Screenshot.zoom_browser(@browser, 3)
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.cite_button_element],
    3
  )
end

Then(/^I should see Reference icon$/) do
  on(VisualEditorPage).popup_icon_element.when_present.should be_visible
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.popup_icon_element, @current_page.first_reference_element]
  )
end

Then(/^I should see Basic Reference dialog box$/) do
  on(VisualEditorPage).window_frame_element.when_present.should be_visible
  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.window_frame_element]
  )
end

Then(/^I should see the Edit source tab at the top of the page$/) do
  on(VisualEditorPage).edit_source_tab_element.when_present.should be_visible
end

Then(/^I should see the Edit tab at the top of the page$/) do
  on(VisualEditorPage) do |page|
    page.language_notification_element.when_not_present(10)
    page.ve_edit_tab_element.when_present.should be_visible
  end

  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.top_editing_tabs_element],
    3
  )
end

Then(/^I should see the VisualEditor tool-bar$/) do
  on(VisualEditorPage) do |page|
    page.toolbar_element.when_present.should be_visible
    page.language_notification_element.when_not_present(10)
  end

  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.top_editing_tabs_element, @current_page.left_navigation_element, @current_page.toolbar_element]
  )
end

Then(/^I should see the formula insertion menu$/) do
  on(VisualEditorPage) do |page|
    page.window_frame_element.when_present.should be_visible
    page.formula_image_element.when_present(5).should be_visible
  end

  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.window_frame_element, @current_page.formula_image_element],
    3
  )
end

Then(/^I should see action buttons in the end of the VisualEditor toolbar$/) do
  on(VisualEditorPage) do |page|
    page.toolbar_actions_element.when_present.should be_visible
    page.save_enabled_element.when_present(10).should be_visible
  end

  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.toolbar_actions_element]
  )
end

Then(/^I should see References list dialog box$/) do
  on(VisualEditorPage).window_frame_element.when_present.should be_visible

  Screenshot.capture(
    @browser,
    "#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png",
    [@current_page.window_frame_element]
  )
end

When(/^I go to language screenshot page$/) do
  step 'I am on the Language Screenshot page'
  @browser.goto "#{@browser.url}&setlang=#{ENV['LANGUAGE_SCREENSHOT_CODE']}"
end
