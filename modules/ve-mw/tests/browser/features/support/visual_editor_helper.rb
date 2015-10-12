#
# Shared helper for VE browser test step definitions
#
module VisualEditorHelper
  def translate(string)
    file = File.read i18n_file
    json = JSON.parse(file)
    json["visualeditor-languagescreenshot-#{string.downcase.gsub(' ', '-')}-text"] || ''
  end

  def i18n_file
    language = lookup(:language_screenshot_code)
    (File.exist?("i18n/#{language}.json")) ? "i18n/#{language}.json" : 'i18n/en.json'
  end
end
