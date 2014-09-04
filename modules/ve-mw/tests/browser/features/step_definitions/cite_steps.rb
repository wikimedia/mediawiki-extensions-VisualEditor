Given(/^I click the Cite button$/) do
  on(VisualEditorPage).cite_button_element.when_present.click
end

Given(/^I can see the Cite User Interface$/) do
  on(VisualEditorPage).cite_select_element.when_present
end

When(/^I click Add more information$/) do
  on(VisualEditorPage).cite_add_more_information_button_element.when_present.click
end

When(/^I click Book$/) do
  on(VisualEditorPage).cite_book_element.when_present.click
end

When(/^I click Book Add more information$/) do
  on(VisualEditorPage).book_add_more_information_button_element.when_present.click
end

When(/^I click Insert Citation$/) do
  on(VisualEditorPage).insert_citation_element.when_present.click
end

When(/^I click Journal$/) do
  on(VisualEditorPage).cite_journal_element.when_present.click
end

When(/^I click News$/) do
  on(VisualEditorPage).cite_news_element.when_present.click
end

When(/^I click the new field label$/) do
  on(VisualEditorPage).cite_new_field_label_element.when_present.click
end

When(/^I click Website$/) do
  on(VisualEditorPage).cite_website_element.when_present.click
end

When(/^I fill in the first textarea with "(.*?)"$/) do |first_string|
  on(VisualEditorPage).cite_first_textarea_element.when_present.send_keys first_string
end

When(/^I fill in the second textarea with "(.*?)"$/) do |second_string|
  on(VisualEditorPage).cite_second_textarea_element.when_present.send_keys second_string
end

When(/^I fill in the third textarea with "(.*?)"$/) do |third_string|
  on(VisualEditorPage).cite_third_textarea_element.when_present.send_keys third_string
end

When(/^I fill in the fourth textarea with "(.*?)"$/) do |fourth_string|
  on(VisualEditorPage).cite_fourth_textarea_element.when_present.send_keys fourth_string
end

When(/^I fill in the fifth textarea with "(.*?)"$/) do |fifth_string|
  on(VisualEditorPage).cite_fifth_textarea_element.when_present.send_keys fifth_string
end

When(/^I fill in the sixth textarea with "(.*?)"$/) do |sixth_string|
  on(VisualEditorPage).cite_sixth_textarea_element.when_present.send_keys sixth_string
end

When(/^I fill in the seventh textarea with "(.*?)"$/) do |seventh_string|
  on(VisualEditorPage).cite_seventh_textarea_element.when_present.send_keys seventh_string
end

When(/^I fill in the eighth textarea with "(.*?)"$/) do |eighth_string|
  on(VisualEditorPage).cite_eighth_textarea_element.when_present.send_keys eighth_string
end

When(/^I fill in the new field "(.*?)"$/) do |new_field_text|
  on(VisualEditorPage).cite_new_website_field_element.when_present.send_keys new_field_text
end

When(/^I see Show more fields$/) do
  on(VisualEditorPage).cite_show_more_fields_element.when_present
end

When(/^I type in a field name "(.*?)"$/) do |custom_field|
  on(VisualEditorPage).cite_custom_field_name_element.when_present.send_keys custom_field
end

When(/^the Book input field titles are in the correct order$/) do
  on(VisualEditorPage).cite_ui.should match /Title.+Last name.+First name.+Publisher.+Year of publication.+ISBN.+Location of publication.+Page/m
end

When(/^the Journal input field titles are in the correct order$/) do
  on(VisualEditorPage).cite_ui.should match /Title.+Source date/m
end

When(/^the News input field titles are in the correct order$/) do
  on(VisualEditorPage).cite_ui.should match /URL.+Source title.+Last name.+First name.+Source date.+Work.+URL access date/m
end

When(/^the Website input field titles are in the correct order$/) do
  on(VisualEditorPage).cite_ui.should match /URL.+Source title.+Source date.+URL access date.+Website title.+Publisher.+Last name.+First name/m
end

Then(/^diff view should show the Book citation added$/) do
  on(VisualEditorPage) do |page|
    page.wait_until(10) do
      page.links_diff_view.include? "Cite VisualEditor Test"
    end
    page.links_diff_view.should match Regexp.escape("<ref>{{Cite book|title = Book title|last = Book author last name|first = Book author first name|publisher = Book publisher|year = 2014|isbn = 9780743273565|location = Location of publication|pages = 123|New book field = New book field contents}}</ref>Cite VisualEditor Test")
  end
end

Then(/^diff view should show the Journal citation added$/) do
  on(VisualEditorPage) do |page|
    page.wait_until(10) do
      page.links_diff_view.include? "Cite VisualEditor Test"
    end
    page.links_diff_view.should match Regexp.escape("<ref>{{Cite journal|title = Journal title|date = Journal Source date}}</ref>Cite VisualEditor Test")
  end
end

Then(/^diff view should show the News citation added$/) do
  on(VisualEditorPage) do |page|
    page.wait_until(10) do
      page.links_diff_view.include? "Cite VisualEditor Test"
    end
    page.links_diff_view.should match Regexp.escape("<ref>{{Cite news|url = News URL|title = News Source title|last = News Last name|first = News First name|date = News Source date|work = News Work|accessdate = News URL access date}}</ref>Cite VisualEditor Test")
  end
end

Then(/^diff view should show the Website citation added$/) do
  on(VisualEditorPage) do |page|
    page.wait_until(10) do
      page.links_diff_view.include? "Cite VisualEditor Test"
    end
    page.links_diff_view.should match Regexp.escape("<ref>{{Cite web|url = http://en.wikipedia.org/|title = Website Source title|date = Website Source date 28 July 2014|accessdate = 28 July 2014|website = Website title|publisher = Website publisher|last = Website Last name|first = Website First name|New website field = New website field contents}}</ref>Cite VisualEditor Test")
  end
end