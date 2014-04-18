@en.wikipedia.beta.wmflabs.org @firefox @login @make_selectable_line @test2.wikipedia.org
Feature: VisualEditor Bullets, Numbering

  Scenario Outline: check strings for bullets and numbering
    When I click <control>
      And I click Save page
      And I click Review your changes
    Then a <character> is added in front of input string in the diff view
      And I can click the X on the save box
  Examples:
    | control   | character |
    | Numbering | #         |
    | Bullets   | *         |

  Scenario Outline: check increase indent for bullets and numbering
    When I click <control>
      And I click Increase indentation
      And I click Save page
      And I click Review your changes
    Then a <character> is added in front of input string in the diff view
      And I can click the X on the save box
      And I click Decrease indentation
  Examples:
    | control   | character |
    | Numbering | ##        |
    | Bullets   | **        |

  Scenario Outline: check decrease indent for bullets and numbering
    When I click <control>
      And I click Decrease indentation
      And I click Save page
      And I click Review your changes
    Then nothing is added in front of input string in the diff view
      And I can click the X on the save box
  Examples:
    | control   |
    | Numbering |
    | Bullets   |
