import puppeteer from 'puppeteer'

import {CSS_RULE_TYPES} from './constants'

const castArray = input => Array.isArray(input) ? input : [input]

/**
 * @param {String} html
 * @return {String}
 */
function getSelector (html) {
  const match = /<\s*([a-z]+)/i.exec(html)
  if (!match) {
    throw new Error(`Input HTML was not valid. Received:\n"${html}"`) // TODO truncate the html?
  }

  const tagName = match[1].toLowerCase()
  // TODO are there other singletons?
  // TODO this tagName should be taken into account when doing isRoot
  if (['html', 'head', 'body'].includes(tagName)) {
    return tagName
  }

  return `body > ${tagName}` // TODO use first child of type instead?
}

/**
 * needs to be run in a browser context
 * @param {Object} CSS_RULE_TYPES TODO - should this be a stub as well
 * @param {String} elementQuery
 * @param {Boolean} options
 * @return {Array}
 */
function findMatchingSelectors (CSS_RULE_TYPES, elementQuery, options) {
  // TODO are both of these necessary?
  const matches = Function.call.bind(
    window.Element.prototype.matchesSelector ||
    window.Element.prototype.webkitMatchesSelector
  )

  // STUB:findMatchingRules

  // STUB:findMatchingSegment

  // STUB:formatRule

  let rules = []
  for (let {cssRules} of document.styleSheets) {
    rules = rules.concat(addCssRules(cssRules)) // TODO use splice?
  }

  function addCssRules (rules, result = []) {
    for (let rule of rules) {
      switch (CSS_RULE_TYPES[rule.type]) {
        case 'STYLE_RULE':
          result.push(rule)
          break
        case 'MEDIA_RULE':
          result = addCssRules(rule.cssRules, result)
          break
      }
    }

    return result
  }

  const element = document.querySelector(elementQuery)

  // eslint-disable-next-line no-undef
  return findMatchingRules(matches, rules, element, options, true)
}

/**
 * @param {Browser} browser
 * @param {Array<Object>} styles
 * @param {String} html
 * @return {Object}
 */
async function createPage (browser, styles, html) {
  const page = await browser.newPage()
  await page.setContent(html)
  // console.log(await page.content())
  for (let i = 0; i < styles.length; i++) {
    await page.addStyleTag(styles[i])
  }

  await page.on('console', msg => console.log(msg.text())) // TODO is await needed here?
  return page
}

/**
 * @param {Array<Object>} styles
 * @param {String} html
 * @param {Object} options
 * @return {Promise<Array>}
 */
function getMatchingSelectors (styles, html, options) {
  // styles = Array.isArray(styles) ? styles : [styles]
  // TODO call this function from index.js
  const elementQuery = getSelector(html)
  return puppeteer.launch().then(async browser => {
    const page = await createPage(browser, castArray(styles), html)
    const selectors = await page.evaluate(
      findMatchingSelectors,
      CSS_RULE_TYPES,
      elementQuery,
      options
    )

    browser.close()
    return selectors
  })
}

export {
  getMatchingSelectors
}
