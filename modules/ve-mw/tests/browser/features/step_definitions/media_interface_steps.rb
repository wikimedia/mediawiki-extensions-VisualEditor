When(/^I click Media$/) do
  on(VisualEditorPage) do |page|
    page.insert_indicator_down_element.when_present.click
    page.ve_media_menu_element.when_present.click
  end
end

When(/^I enter (.+) into media Search box$/) do |content|
  on(VisualEditorPage) do |page|
    page.media_search_element.when_present.click
    page.media_search_element.when_present.send_keys(content)
  end
end

When(/^I select an Image$/) do
  on(VisualEditorPage).media_select_element.when_present(20).click
end

When (/^I click Use this image/) do
  on(VisualEditorPage).use_image_button_element.when_present.click
end

When (/^I click Insert$/) do
  on(VisualEditorPage).media_insert_button_element.when_present.click
end

Then(/^(.+) should appear in the media diff view$/) do |headings_string|
  on(VisualEditorPage) do |page|
    # Contents pulled from the Cucumber tables in the .feature are escaped regexes.
    # In this case we want unescaped regexes (and in one case a leading space)
    # So we put single quotes around the entries in the .feature file and strip them here to get unescaped regexes.
    headings_string = headings_string.gsub(/'/, '')
    page.wait_until(15) do
      page.diff_view.include? 'Your text'
    end
    expect(page.diff_view).to match headings_string
  end
end

Then(/^I can click the X on the media save box$/) do
  on(VisualEditorPage).media_exit_element.when_present.click
end
