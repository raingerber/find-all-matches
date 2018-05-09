/* eslint-env jest */

const {findMatches} = require('../__test__/index')

const formatSelector = (a, b) => [a, b ? `???${b}???` : b]

describe('findMatches', () => {
  const styles = {
    content: `
      div {
        color: red;
      }
      div > div {
        color: blue;
      }
      div > div > div {
        color: green;
      }
    `
  }
  const html = `
    <div class="parent">
      <div class="child">
      </div>
    </div>
  `
  it('should ignore DOM children when options.recursive === false', async () => {
    const options = {
      recursive: false
    }
    const result = await findMatches(styles, html, options)
    expect(Object.keys(result)).toEqual(['matches']) // no "children" key
  })
  it('should include css arrays when option.includeCss is true', async () => {
    const options = {
      recursive: true,
      includeCss: true
    }
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should ignore partial matches when options.findPartialMatches is false', async () => {
    const options = {
      formatSelector,
      recursive: true,
      findPartialMatches: false
    }
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should include partial matches when options.findPartialMatches is true', async () => {
    const options = {
      formatSelector,
      recursive: true,
      findPartialMatches: true
    }
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should not return "body >" inside a full match', async () => {
    const options = {
      formatSelector,
      recursive: false,
      findPartialMatches: true
    }
    const styles = `
      body > * {
        color: green;
      }
    `
    const html = `
      <div></div>
    `
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should work for a complex bit of html and css', async () => {
    const options = {
      formatSelector,
      recursive: true,
      findPartialMatches: true
    }
    const styles = `
      .container {
        padding: 5px;
      }
      .sibling ~ section {
        font-size: 50px;
      }
      html.namaste li:first-of-type ~ li {
        color: green;
      }
      @media (max-width: 500px) {
        .class1 > .class2 > section > div > * > li:first-of-type {
          color: purple;
        }
        .class1 > class2 li:first-of-type {
          color: yellow;
        }
      }
      @media (max-width: 1000px) {
        div[data-gloop="true"] > * {
          margin: 10px;
        }
      }
    `
    const html = `
      <section class="container">
        <div>
          <ul class="container">
            <li></li>
            <li></li>
            <li></li>
          </ul>
        </div>
      </section>
    `
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
})
