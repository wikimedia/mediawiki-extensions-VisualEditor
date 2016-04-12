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
    file_name = File.expand_path("../../i18n/#{language}.json", __dir__)
    unless File.exist?(file_name)
      file_name = File.expand_path('../../i18n/en.json', __dir__)
    end
    file_name
  end
end
