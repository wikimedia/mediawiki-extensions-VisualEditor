def license(language_code, file_name)
  require "date"
  date = Date.today.to_s
  "=={{int:filedesc}}==
{{Information
|description={{en|1=#{file_name}}}
|date=#{date}
|source=[[User:LanguageScreenshotBot|Automatically created by LanguageScreenshotBot]]
|author=[[User:LanguageScreenshotBot|Automatically created by LanguageScreenshotBot]]
|permission=
|other_versions=
|other_fields=
}}

=={{int:license-header}}==
{{Wikipedia-screenshot}}

[[Category:VisualEditor-#{language_code}]]"
end

def upload_image file_path
  language_code = ENV['LANGUAGE_SCREENSHOT_CODE']
  file_name = File.basename(file_path, "")
  file_license = license(language_code, file_name)

  require 'mediawiki_api'
  client = MediawikiApi::Client.new ENV["MEDIAWIKI_API_UPLOAD_URL"]
  client.log_in ENV["MEDIAWIKI_USER"], ENV["MEDIAWIKI_PASSWORD"]
  client.upload_image(file_name, file_path, file_license, true)
  sleep 5 # Restriction in bot speed: https://commons.wikimedia.org/wiki/Commons:Bots#Bot_speed
end

def upload_images
  screenshot_directory = ENV["LANGUAGE_SCREENSHOT_PATH"] || "./screenshots"
  Dir["#{screenshot_directory}/*.png"].each do |file_path|
    puts "Uploading #{file_path}"
    upload_image file_path
  end
end

ENV["MEDIAWIKI_PASSWORD"] = ENV[ENV["MEDIAWIKI_PASSWORD_VARIABLE"]] if ENV["MEDIAWIKI_PASSWORD_VARIABLE"]
upload_images
