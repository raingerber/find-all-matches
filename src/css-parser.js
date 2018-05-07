import puppeteer from 'puppeteer'

import {stringifySelectors} from './stringify'

/**
 * @param {Browser} browser
 * @param {Array<Object>} styles
 * @param {String} html
 * @return {Object}
 */
async function createPage (browser, styles, html) {
  const page = await browser.newPage()
  await page.setContent(html)
  for (let style of styles) {
    await page.addStyleTag(style)
  }

  page.on('console', msg => console.log(msg.text()))
  return page
}

/**
 * @param {Page} page
 * @param {String} html
 * @return {String}
 * @throws if the string does not contain an HTML tag,
 *         or the tagName is not found in the given page
 */
async function getElementQuery (page, html) {
  const htmlWithNoComments = html.replace(/<!--[\s\S]*?-->/g, '')
  const match = /^\s*<\s*([a-z]+)/i.exec(htmlWithNoComments)
  if (match) {
    const tagName = `${match[1].toLowerCase()}:first-of-type`
    if (await page.evaluate(`!!document.querySelector('${tagName}')`)) {
      return tagName
    }
  }

  throw new Error('Input HTML does not contain a valid tag.')
}

/**
 * needs to be run in a browser context
 * @param {String} elementQuery
 * @param {Object} options
 * @return {Array<Object>}
 */
function findMatchingRules (elementQuery, options) {
  // STUB:getCssRules

  // STUB:findRulesForElement

  // STUB:testIfSelectorIsMatch

  // STUB:findMatchingPartOfSelector

  // STUB:combinatorPreventsMatch

  // STUB:getElementsUsingCombinator

  // STUB:formatRule

  const matches = Function.call.bind(window.Element.prototype.webkitMatchesSelector)

  // eslint-disable-next-line no-undef
  const rules = getCssRules(document.styleSheets)
  const element = document.querySelector(elementQuery)

  // eslint-disable-next-line no-undef
  return findRulesForElement(matches, rules, element, options, 0)
}

/**
 * @param {Array<Object>} styles
 * @param {String} html
 * @param {Object} options
 * @return {Object}
 */
async function findMatchesFromPage (styles, html, options) {
  const browser = await puppeteer.launch()
  let selectors
  try {
    const page = await createPage(browser, styles, html)
    const elementQuery = await getElementQuery(page, html)
    selectors = await page.evaluate(findMatchingRules, elementQuery, options)
    selectors = stringifySelectors(selectors, options)
  } catch (error) {
    browser.close()
    throw error
  }

  browser.close()
  return selectors
}

export {
  createPage,
  getElementQuery,
  findMatchingRules,
  findMatchesFromPage
}
