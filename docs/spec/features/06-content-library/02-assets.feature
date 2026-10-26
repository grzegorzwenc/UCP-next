@epic:content-library @status:done
Feature: Assets (images and documents)
  One library of images and documents with accessibility details and a publish status, so pages only use approved, accessible files.

  # Business benefit: Files can be updated without breaking live pages, protecting the customer experience and the bank's reputation. Automatic renaming prevents costly overwrites of approved material.
  Rule: US-06.02.1 · Upload and replace files safely
    As a content author
    I want to upload and replace files without ever overwriting another file or deleting one that pages still use
    So that no live page breaks because of a change in the library

    Scenario: Uploading
      When I drop "hero.jpg" into "Campaigns"
      Then it is uploaded as a draft
      And a second "hero.jpg" becomes "hero-2.jpg"

    Scenario: Replacing keeps pages working
      When I replace "hero.jpg" with a new file
      Then pages that use it show the new file
      And its alt text is kept

    Scenario: Deleting a used file
      Given "hero.jpg" is used on 2 pages
      Then I cannot delete it and I am told "Remove it from pages first"

  # Business benefit: Recording alt text and document accessibility details helps the bank meet its accessibility obligations and avoid legal risk. Customers using assistive technology get the same information as everyone else.
  @depends:US-06.02.1
  Rule: US-06.02.2 · Make files accessible
    As a content author
    I want to record alt text per language for images and the accessibility details of documents
    So that every file on our pages can be used by customers with assistive technology

    Scenario: Alt text per language
      When I open the accessibility panel of an image
      Then I enter alt text for every language of the market, the first one required
      And instead of alt text I can mark it "Decorative only"
      And I am told not to start with "image of" and to keep it under 150 characters

    Scenario: Documents
      Then a PDF needs a title, a language and "Tagged PDF, checked"

  # Business benefit: Reusing approved files avoids duplicate purchases and repeated approvals, lowering cost. Smart views surface unused and inaccessible files so problems are fixed before audits find them.
  @depends:US-06.02.1 @depends:US-06.02.2
  Rule: US-06.02.3 · Find the right file
    As a content author
    I want to browse files by folder and type and see which ones are unused or missing accessibility details
    So that I reuse approved files and can clean up problems quickly

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

  # Business benefit: Only approved files can appear on live pages, reducing brand, legal and compliance risk. The publish record shows who approved each file and when, supporting audits.
  @depends:US-06.02.1
  Rule: US-06.02.4 · Approve files for live use
    As a publisher
    I want to publish draft files and have pages refused while they still use a draft file
    So that customers only ever see approved files

    Scenario: Publishing a file
      Given I have Publish
      When I click "Publish" on a draft file
      Then it shows "Published" with who and when

    Scenario: A page cannot go live with a draft file
      Then publishing a page that uses a draft file is refused until the file is published
