require 'mediawiki_selenium/cucumber'
require 'mediawiki_selenium/pages'
require 'mediawiki_selenium/step_definitions'

require 'screenshot'

require_relative 'hooks'
require_relative 'visual_editor_helper'

World(VisualEditorHelper)
