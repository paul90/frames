function checkJournal (pageJSON, site, slug) {
  const resultPage = {
    title: 'Journal Checker Results',
    story: [],
    journal: []
  }

  function randomId () {
    return Array.apply(null, Array(8)).map(function () { return (((1 + Math.random()) * 0x100) | 0).toString(16).substring(1) }).join('')
  }

  function addItem (item) {
    const journalEntry = {
      type: 'add',
      id: randomId(),
      item: item,
      date: Date.now()
    }
    if (resultPage.story.length > 0) {
      journalEntry.after = resultPage.story[resultPage.story.length - 1].id
    }
    resultPage.story.push(item)
    resultPage.journal.push(journalEntry)
  }

  function compare (a, b) {
    try {
      if (a.date < b.date) {
        return -1
      }
      if (a.date > b.date) {
        return 1
      }
      return 0
    } catch (error) {
      // date missing, or equal, so...
      return 0
    }
  }

  function basicChecks (page) {
    // check for nulls
    const isNotNull = (item) => (!item || !item.type)
    if (page.story.every(isNotNull)) {
      console.info('Nulls found')
      addItem({
        type: 'html',
        text: "<span style='color: red; font-weight: bold'>NULLS</span> story contains null items or null type in item. "
      })
    }

    // check for huge and bloated journal
    const storyLength = JSON.stringify(page.story, null, 2).length
    const journalLength = JSON.stringify(page.journal || [], null, 2).length
    if (storyLength + journalLength > 5000000) {
      console.info('Page is HUGE')
      addItem({
        type: 'html',
        text: "<span style='color: red; font-weight: bold'>HUGE</span> page is too big to fork, greater than 5 MB."
      })
    }
    if (storyLength > 5000 && journalLength > 20 * storyLength) {
      console.info('Journal is bloated')
      addItem({
        type: 'html',
        text: "<span style='color: red; font-weight: bold'>BLOATED</span> journal is more than twenty times bigger than story."
      })
    }

    // check chronology
    let chronError = false
    let date = null
    for (const action of page.journal) {
      if (date && action.date && date > action.date) {
        console.info('Journal is out of order')
        addItem({
          type: 'html',
          text: "<span style='color: red; font-weight: bold'>CHRONOLOGY</span> journal contains items out of chronological order. "
        })
        chronError = true
        break
      }
      date = action.date
    }

    // check journal can recreate current page

    // apply journal action to page
    function applyAction (page, action) {
      let index
      const order = () => Array.from(page.story || []).map((item) => (item !== null ? item.id : undefined))

      const add = function (after, item) {
        const index = order().indexOf(after) + 1
        return page.story.splice(index, 0, item)
      }

      const remove = function () {
        let index
        if ((index = order().indexOf(action.id)) !== -1) {
          return page.story.splice(index, 1)
        }
      }

      if (!page.story) { page.story = [] }

      let after, item

      switch (action.type) {
        case 'create':
          if (action.item !== null) {
            if (action.item.title !== null) { page.title = action.item.title }
            if (action.item.story !== null) { page.story = action.item.story.slice() }
          }
          break
        case 'add':
          add(action.after, action.item)
          break
        case 'edit':
          if ((index = order().indexOf(action.id)) !== -1) {
            page.story.splice(index, 1, action.item)
          } else {
            page.story.push(action.item)
          }
          break
        case 'move':
          // construct relative addresses from absolute order
          index = action.order.indexOf(action.id)
          after = action.order[index - 1]
          item = page.story[order().indexOf(action.id)]
          remove()
          add(after, item)
          break
        case 'remove':
          remove()
          break
      }

      if (!page.journal) { page.journal = [] }
      return page.journal.push(action)
    }

    let revPage = { title: page.title, story: [] }
    for (const action of page.journal || []) {
      applyAction(revPage, action || {})
    }
    if (JSON.stringify(page.story) !== JSON.stringify(revPage.story)) {
      console.info('Revision problem', { page, revPage })
      addItem({
        type: 'html',
        text: "<span style='color: red; font-weight: bold'>REVISION</span> journal cannot construct the current version."
      })
    }

    // did we have chron error, does sorting cause a problem
    if (chronError) {
      const sortedJournal = page.journal.sort(compare)

      revPage = { title: page.title, story: [] }
      for (const action of sortedJournal || []) {
        applyAction(revPage, action || {})
      }
      if (JSON.stringify(page.story) !== JSON.stringify(revPage.story)) {
        console.info('Sorted journal has revision problem', { page, revPage })
        addItem({
          type: 'html',
          text: "<span style='color: red; font-weight: bold'>SORTED REVISION</span> sorted journal cannot construct the current version."
        })
      }
    }
  }

  // add the create event to the journal
  resultPage.journal.push({
    type: 'create',
    item: {
      title: 'Journal Checker Results',
      story: []
    },
    date: Date.now()
  })

  // add a reference to the page we are checking
  addItem({
    type: 'reference',
    site,
    slug,
    title: pageJSON.title,
    text: ''
  })

  addItem({
    type: 'pagefold',
    text: 'errors'
  })

  // some initial basic checks
  basicChecks(pageJSON)

  addItem({
    type: 'pagefold',
    text: 'notes'
  })

  addItem({
    type: 'html',
    text: "Any line starting in <span style='color: red; font-weight: bold'>RED</span> indicate that the page being checked has some problems."
  })

  addItem({
    type: 'html',
    text: "A <span style='color: red; font-weight: bold'>REVISION</span> error indicates that there is a seroius problem with the page."
  })

  addItem({
    type: 'html',
    text: "A <span style='color: red; font-weight: bold'>HUGE</span>, <span style='color: red; font-weight: bold'>BLOATED</span>, or <span style='color: red; font-weight: bold'>CHRONOLOGY</span> might be resolved by compacting the page journal (see [[Journal Compactor]])."
  })

  return resultPage
}

export { checkJournal }
