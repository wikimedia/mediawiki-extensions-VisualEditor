@chrome @en.wikipedia.beta.wmflabs.org @firefox @internet_explorer_10 @safari @test2.wikipedia.org
Feature: VisualEditor Options

  Background:
    Given I go to the "Options VisualEditor Test" page with content "Options VisualEditor Test"
      And I click in the editable part
      And I click the hamburger menu

  Scenario: Options
    When I click Options
    Then I should see the options overlay

  Scenario: Advanced Settings
    When I click Advanced Settings
    Then I should see the options overlay
      And the options overlay should display Advanced Settings

  Scenario: Page Settings
    When I click Page Settings
    Then I should see the options overlay
      And the options overlay should display Page Settings

  Scenario: Categories
    When I click Categories
    Then I should see the options overlay
      And the options overlay should display Categories