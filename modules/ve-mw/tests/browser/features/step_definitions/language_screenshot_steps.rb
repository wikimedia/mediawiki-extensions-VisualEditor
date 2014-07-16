Given(/^I am editing a random page$/) do
  step "I am at a random page"
  @browser.goto "#{@browser.url}?uselang=#{ENV['LANGUAGE_SCREENSHOT_CODE']}&vehidebetadialog=true&veaction=edit"
  step "I click in the editable part"
end

Then(/^I should see Headings pull-down menu$/) do
  on(VisualEditorPage).heading_dropdown_menus_element.when_present.should be_visible
  step "I take screenshot of pull-dowm menu"
end

Then(/^I take screenshot of pull-dowm menu$/) do
  capture_screenshot("#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png", [@current_page.downarrow_element, @current_page.heading_dropdown_menus_element])
end

Then(/^I should see Formatting pull-down menu$/) do
  on(VisualEditorPage).formatting_option_menus_element.when_present.should be_visible
  step "I take screenshot of Formatting pull-down menu"
end

Then(/^I take screenshot of Formatting pull-down menu$/) do
  capture_screenshot("#{@scenario.name}-#{ENV['LANGUAGE_SCREENSHOT_CODE']}.png", [@current_page.ve_text_style_element,@current_page.formatting_option_menus_element])
end
