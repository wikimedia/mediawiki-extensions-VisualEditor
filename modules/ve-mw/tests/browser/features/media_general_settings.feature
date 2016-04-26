@en.wikipedia.beta.wmflabs.org @firefox @skip
Feature: VisualEditor Media Interface

  Background:
    Given I go to the "Media Interface VisualEditor Test" page with content "Media Interface VisualEditor Test"
      And I click in the editable part

  Scenario: VisualEditor insert new media
    Given I click Media
      And I enter Apollo 11 bootprint into media Search box
      And I select an Image
      And I click Use this image
      And I fill up the Caption field with "caption"
      And I fill up the Alternative text with "alt text"
      And I click Insert
      And I click Save page
      And I click Review your changes
    Then diff view should show media file with caption and alt text
