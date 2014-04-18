@en.wikipedia.beta.wmflabs.org @firefox @login @make_selectable_line @test2.wikipedia.org
Feature: VisualEditor Indent, Outdent

 Scenario: Check indentation controls disabled by default
    Then Decrease indentation should be disabled
      And Increase indentation should be disabled

  Scenario Outline: check indent and outdent enable and disable
    When I click <control>
    Then Decrease indentation should be <initial_state>
      And Increase indentation should be <initial_state>
      And I undo <control>
      And Decrease indentation should be <final_state>
      And Increase indentation should be <final_state>
  Examples:
    | control   | initial_state | final_state |
    | Bullets   | enabled       | disabled    |
    | Numbering | enabled       | disabled    |
