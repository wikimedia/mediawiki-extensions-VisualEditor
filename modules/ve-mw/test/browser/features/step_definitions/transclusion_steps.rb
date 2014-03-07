Given(/^I can see the Transclusion User Interface$/) do
  on(VisualEditorPage).template_header_element.when_present
end

Given(/^I click Add parameter$/) do
  on(VisualEditorPage).add_parameter_element.when_present.click
end

When(/^I click Remove parameter$/) do
  on(VisualEditorPage).remove_parameter_element.when_present.click
end

When(/^I click Remove template$/) do
  on(VisualEditorPage).remove_template_element.when_present.click
end

Given(/^I click the parameter representation containing q$/) do
  on(VisualEditorPage).parameter_icon_element.when_present.click
end

When(/^I click Transclusion$/) do
  on(VisualEditorPage) do |page|
    page.insert_menu_element.when_present.click
    page.transclusion_element.when_present.click
  end
end

When(/^I enter (.+) in the parameter box$/) do |param_value|
  on(VisualEditorPage) do |page|
    page.parameter_box_element.when_present.send_keys(param_value)
  end
end

When(/^I enter (.+) into transclusion Content box$/) do |content|
  on(VisualEditorPage) do |page|
    page.wait_until(10) do
      page.transclusion_textfield_element.exists?
    end
    page.transclusion_textfield_element.send_keys(content)
  end
end

Then(/^I see a list of template suggestions$/) do
  on(VisualEditorPage).suggestion_list_element.when_present.should be_visible
end

Then(/^I click the Add template button$/) do
  on(VisualEditorPage).add_template_element.when_present.click
end

Then(/^I should not be able to see parameter named (.+)$/) do |param_name|
  on(VisualEditorPage).template_list_item_element.should_not be_visible
end

Then(/^I see an input text area$/) do
  on(VisualEditorPage).transclusion_textfield_element.when_present
end

Then(/^I should see the Add parameter link$/) do
  on(VisualEditorPage).add_parameter_element.should be_visible
end

Then(/^I should see the Apply changes button$/) do
  on(VisualEditorPage).apply_changes_element.when_present.should be_visible
end
