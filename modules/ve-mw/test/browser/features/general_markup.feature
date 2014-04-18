@en.wikipedia.beta.wmflabs.org @firefox @login @make_selectable_line @test2.wikipedia.org
Feature: VisualEditor general text markup features

  Scenario Outline: VisualEditor general markup
    When I click the text style menu
    And I click the <type_of_markup> menu option
    And I click Save page
    And I click Review your changes
    Then <expected_markup_text> should appear in the diff view
    And I can click the X on the save box
  Examples:
    | type_of_markup | expected_markup_text            |
    | Bold           | '''This is a new line'''        |
    | Computer Code  | <code>This is a new line</code> |
    | Italics        | ''This is a new line''          |
    | Strikethrough  | <s>This is a new line</s>       |
    | Subscript      | <sub>This is a new line</sub>   |
    | Superscript    | <sup>This is a new line</sup>   |
    | Underline      | <u>This is a new line</u>       |