Given(/^I can see the Link User Inteface$/) do
  on(VisualEditorPage) do |page|
    page.ve_link_ui_element.when_present
    page.ve_link_ui.should match Regexp.escape("Link")
  end
end

When(/^I click Done to close Link User Interface$/) do
  on(VisualEditorPage).links_done_element.when_present.click
end

When(/^I click Links Review your changes$/) do
  on(VisualEditorPage).review_changes_element.when_present.click
end

When(/^I click the Link button$/) do
  on(VisualEditorPage).ve_link_icon_element.when_present.click
end

When(/^I enter external link (.+) into link Content box$/) do |link_content|
  on(VisualEditorPage) do |page|
    page.link_textfield_element.when_present
    page.link_textfield_element.send_keys(link_content)
    page.link_overlay_external_link_element.when_present
  end
end

When(/^I enter internal link (.+) into link Content box$/) do |link_content|
  on(VisualEditorPage) do |page|
    page.link_textfield_element.when_present
    page.link_textfield_element.send_keys(link_content)
    page.link_overlay_wiki_page_element.when_present
  end
end

When(/^I enter non existing link (.+) into link Content box$/) do |link_content|
  on(VisualEditorPage) do |page|
    page.link_textfield_element.when_present
    page.link_textfield_element.send_keys(link_content)
    page.link_overlay_does_not_exist_element.when_present
  end
end

Then(/^a non\-existing link appears in the diff view$/) do
  on(VisualEditorPage) do |page|
    page.wait_until(10) do
      page.diff_view.include? "DoesNotExist"
    end
    page.diff_view.should match Regexp.escape("[[DoesNotExist|Links]]")
  end
end

Then(/^an external link appears in the diff view$/) do
  on(VisualEditorPage) do |page|
    page.wait_until(10) do
      page.diff_view.include? "example.com"
    end
    page.diff_view.should match Regexp.escape("[http://www.example.com Links]")
  end
end

Then(/^an internal link appears in the diff view$/) do
  on(VisualEditorPage) do |page|
    page.wait_until(10) do
      page.diff_view.include? "Main Page"
    end
    page.diff_view.should match Regexp.escape("[[Main Page|Links]]")
  end
end
