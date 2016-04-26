@en.wikipedia.beta.wmflabs.org @firefox @skip
Feature: VisualEditor Media Interface

  Background:
    Given I go to the "Media Interface VisualEditor Test" page with content "Media Interface VisualEditor Test"
      And I click in the editable part

  Scenario Outline: VisualEditor insert new media
    Given I click Media
      And I enter <search_term> into media Search box
      And I select an Image
      And I click Use this image
      And I click Insert
      And I click Save page
      And I click Review your changes
    Then  diff view should show correct markup
  Examples:
  | search_term           |
  | Apollo 11 bootprint   |
