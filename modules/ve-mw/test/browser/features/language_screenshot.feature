@en.wikipedia.beta.wmflabs.org @firefox @language_screenshot
Feature: Language Screenshot

  Scenario: VisualEditor_Toolbar_Headings
    Given I am editing a random page
    When I click the down arrow on Headings interface
    Then I should see Headings pull-down menu

  Scenario: VisualEditor_Toolbar_Formatting
    Given I am editing a random page
    When I click the text style menu
    Then I should see Formatting pull-down menu

