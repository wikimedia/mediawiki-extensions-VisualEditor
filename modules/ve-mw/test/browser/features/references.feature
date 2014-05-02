@edit_user_page @en.wikipedia.beta.wmflabs.org @firefox @login @test2.wikipedia.org
Feature: VisualEditor References

  Scenario: VisualEditor References
    Given I click Reference
      And I can see the References User Interface
    When I enter THIS IS CONTENT into Content box
      And I click Insert reference
    Then link to Insert menu should be visible
