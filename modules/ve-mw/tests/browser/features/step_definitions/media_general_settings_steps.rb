Given(/^I fill up the Caption field with "(.*?)"$/) do |first_string|
  on(VisualEditorPage).caption_element.when_present.send_keys (first_string)
end

Given(/^I fill up the Alternative text with "(.*?)"$/) do |second_string|
  on(VisualEditorPage).alternative_text_element.when_present.send_keys (second_string)
end
