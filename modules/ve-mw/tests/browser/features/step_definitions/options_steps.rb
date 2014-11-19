When(/^I click Advanced Settings$/) do
  on(VisualEditorPage).option_advanced_settings_element.when_present.click
end

When(/^I click Categories$/) do
  on(VisualEditorPage).options_categories_element.when_present.click
end

When(/^I click Options$/) do
  on(VisualEditorPage).options_in_hamburger_element.when_present.click
end

When(/^I click Page Settings$/) do
  on(VisualEditorPage).option_page_settings_element.when_present.click
end

When(/^I click the hamburger menu$/) do
  on(VisualEditorPage).hamburger_menu_element.when_present.click
end

When(/^I see options overlay$/) do
  on(VisualEditorPage).options_page_title_element.when_present
end

Then(/^I should see the options overlay$/) do
  expect(on(VisualEditorPage).options_page_title_element.when_present).to be_visible
end

Then(/^the options overlay should display Advanced Settings$/) do
  expect(on(VisualEditorPage).options_settings_content_advanced_element).to be_visible
end

Then(/^the options overlay should display Categories$/) do
  expect(on(VisualEditorPage).options_settings_content_categories_element).to be_visible
end

Then(/^the options overlay should display Page Settings$/) do
  expect(on(VisualEditorPage).options_settings_content_page_settings_element).to be_visible
end
