require_relative 'hooks'
require 'mediawiki_selenium'
require 'mediawiki_api'
require 'screenshot'

include MediawikiApi

def translate(string)
  file = File.read "i18n/#{ENV['LANGUAGE_SCREENSHOT_CODE']}.json"
  json = JSON.parse(file)
  json["languagescreenshot-#{string.downcase.gsub(' ', '-')}-text"] || ''
end
