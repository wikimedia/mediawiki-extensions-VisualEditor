Given(/^I can see the Transclusion User Interface$/) do
  on(VisualEditorPage) do |page|
    page.title_element.when_present
    page.title.should match "Add a template"
  end
end

Given(/^I click Remove template$/) do
  on(VisualEditorPage).remove_template_element.when_present.click
end

Given(/^I click the Add template button$/) do
  on(VisualEditorPage).add_template_element.when_present.click
end

Given(/^I click the parameter representation containing q$/) do
  sleep 1
  on(VisualEditorPage).parameter_icon_element.when_present.click
end

Given(/^I click Transclusion$/) do
  on(VisualEditorPage) do |page|
    page.insert_menu_element.when_present.click
    page.transclusion_element.when_present.click
  end
end

Given(/^I see a list of template suggestions$/) do
  on(VisualEditorPage).suggestion_list_element.when_present
end

Given(/^I see an input text area$/) do
  on(VisualEditorPage).transclusion_description_element.when_present
end

When(/^I click Remove parameter$/) do
  on(VisualEditorPage).remove_parameter_element.when_present.click
end

When(/^I enter (.+) in the parameter box$/) do |param_value|
  sleep 1
  on(VisualEditorPage).transclusion_description_element.when_present.send_keys(param_value)
end

When(/^I enter (.+) into transclusion Content box$/) do |content|
  on(VisualEditorPage).transclusion_textfield_element.when_present.send_keys(content)
end

Then(/^I should see a list of template suggestions$/) do
  on(VisualEditorPage).suggestion_list_element.when_present.should be_visible
end

Then(/^I should see the Insert template button$/) do
  on(VisualEditorPage).insert_template_element.when_present.should be_visible
end
