@chrome @en.wikipedia.beta.wmflabs.org @firefox @login @test2.wikipedia.org
Feature: VisualEditor References

  Background:
    Given I go to the "References VisualEditor Test" page with content "References VisualEditor Test"
      And I click in the editable part

  Scenario: VisualEditor References
    Given I click Reference
      And I can see the References User Interface
    When I enter THIS IS CONTENT into Content box
      And I click Insert reference
    Then link to Insert menu should be visible
