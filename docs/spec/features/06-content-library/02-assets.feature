@epic:content-library @status:done
Feature: Assets (images and documents)
  As a content author
  I want one library of images and documents with accessibility details and a publish status
  So that pages only use approved, accessible files

  Rule: Files are found by folder, type and problems

    Scenario: Browsing
      When I open Assets
      Then I see folders with counts, a grid or list, and filters for Images, Documents and Icons

    Scenario Outline: Smart views
      When I open "<view>"
      Then I see <what>

      Examples:
        | view                         | what                                        |
        | Not used on any page         | files no page uses                          |
        | Missing accessibility info   | images without alt text and untagged PDFs   |

  Rule: Uploads never overwrite

    Scenario: Uploading
      When I drop "hero.jpg" into "Campaigns"
      Then it is uploaded as a draft
      And a second "hero.jpg" becomes "hero-2.jpg"

    Scenario: Replacing keeps pages working
      When I replace "hero.jpg" with a new file
      Then pages that use it show the new file
      And its alt text is kept

  Rule: Files have a publish status

    Scenario: Publishing a file
      Given I have Publish
      When I click "Publish" on a draft file
      Then it shows "Published" with who and when

    Scenario: A page cannot go live with a draft file
      Then publishing a page that uses a draft file is refused until the file is published

  Rule: Images must be accessible

    Scenario: Alt text per language
      When I open the accessibility panel of an image
      Then I enter alt text for every language of the market, the first one required
      And instead of alt text I can mark it "Decorative only"
      And I am told not to start with "image of" and to keep it under 150 characters

    Scenario: Documents
      Then a PDF needs a title, a language and "Tagged PDF, checked"

  Rule: Files in use cannot be deleted

    Scenario: Deleting a used file
      Given "hero.jpg" is used on 2 pages
      Then I cannot delete it and I am told "Remove it from pages first"
