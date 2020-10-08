import { config } from './config.js'
import { stateUrl } from './stateUrl.js'

var firebase = require('firebase/app')
window.firebase = firebase
var Navigo = require('navigo')
require('firebase/auth')
require('firebase/firestore')
require('firebase/storage')
var $ = window.$
window.stateData = {}

const init = async () => {
  console.log(`I am running on version: ${config('version')}`)

  console.table(config())

  // fetch firebase configuration json
  const response = await window.fetch('/__/firebase/init.json')
  const firebaseConfig = await response.json()
  console.table(firebaseConfig)

  // initialize firebase
  firebase.initializeApp(firebaseConfig)
  window.db = firebase.firestore()
  $('body').trigger('dbLoaded')

  window.storage = firebase.storage()
  $('body').trigger('storageLoaded')

  window.auth = firebase.auth()
  $('body').trigger('authLoaded')

  // when a user signs in, out or is first seen this session in either state
  window.auth.onAuthStateChanged(function (user) {
    if (user) {
      $('.currentUsername').text(window.auth.currentUser.displayName)
      $('.userProfileImage').prop('src', window.auth.currentUser.photoURL)
      userAuthenticated(user)
      $('.showIfAuthenticated').show()
      $('.showIfUnauthenticated').hide()
    } else {
      console.log('User is unauthenticated')
      $('.showIfAuthenticated').hide()
      $('.showIfUnauthenticated').show()
    }
  })
}

function userAuthenticated (user) {
  console.log(user)

  window.auth.currentUser
    .getIdTokenResult()
    .then((idTokenResult) => {
      // Confirm the user is an Admin or an affiliate
      if (idTokenResult.claims.admin || idTokenResult.claims.affiliate) {
        console.log('I am an admin or an affiliate')
      } else {
        console.log('I am not an admin, i should not be here')
        window.location.href = `https://parkplanr.app/notTeamMember?uid=${user.uid}`
      }
    })
    .catch((error) => {
      console.log(error)
    })
}

function load404 () {
  // $('#contentDiv').html('4 oh 4')
  loadPage('404')
}

window.loadFragment = function (fragment) {
  console.log(`Loading fragment: ${fragment}`)
  $.get(`/fragments/${fragment}.html`, function (data) {
    try {
      var isFragment = data.startsWith('<!-- FRAGMENT CONTENT-TAG_ID -->')

      if (!isFragment) {
        console.log('Fragment HTML file not found')
        // load404();
        return
      }

      $(`.fragmentHolder[data-fragmentid="${fragment}"]`).each(function () {
        $(this).replaceWith(data)
      })
      router.updatePageLinks()

      var today = new Date()
      $('.currentYear').text(today.getFullYear())
      $('.currentVersion').text(config('version'))

      switch (fragment) {
        case 'header':
          $('#signOutButton').on('click', function () {
            window.auth.signOut()
          })
          break
      }
    } catch (error) {
      console.log(error)
      // bugsnagClient.notify(error);
      // showFatalErrorPage(error);
    }
  }).fail(function (error) {
    console.log('Failed loading fragment')
    // bugsnagClient.notify(error);
    console.log(error)
  })
}

function loadPage (page, params) {
  $.get(`/pages/${page}.html`, function (data) {
    try {
      var isPage = data.startsWith('<!-- PAGE CONTENT-TAG_ID -->')
      var isStandalonePage = data.startsWith(
        '<!-- STANDALONE PAGE CONTENT-TAG_ID -->'
      )
      if (!isPage && !isStandalonePage) {
        console.log('Page HTML file not found')
        if (page === '404') {
          $('#contentDiv').html('4 oh 4')
        }
        return
      }

      // loads the page content into the dom
      if (isPage) {
        if (!$('#contentDiv').length) {
          console.log(
            'Switching from standalone page, loading standard page core layout'
          )
          $('#body').html(
            '<script id="header_Holder">LoadFragment("header");</script><main id="contentDiv"></main><script id="footer_Holder">LoadFragment("footer");</script>'
          )
        }
        $('#contentDiv').html(data)
      } else {
        $('body').html(data)
      }
      router.updatePageLinks()

      // updates any tags with the class CurrentYear with the YYYY year
      $('.currentYear').text(new Date().getFullYear())
      // scrolls back to the top of the window
      window.scrollTo(0, 0)

      switch (page) {
      }
    } catch (error) {
      console.log(error)
      // showFatalErrorPage(error, 'PPERPGCA')
    }
  }).fail(function (error) {
    console.log(error)
    // showFatalErrorPage(error, 'PPERPGLD')
  })
}

console.log(stateUrl())

var root = `https://${window.location.href.split('/')[2]}/`
var useHash = false
var hash = '#!' // Defaults to: '#'
var router = new Navigo(root, useHash, hash)
window.router = router

router.on({
  '/': function () {
    console.log('I am on the home page')
    loadPage('index')
  },
  '/signin': function () {
    console.log('I am on the signin page')
    window.location = '/signin'
  }
})

router.notFound(function () {
  console.log('Route not found')
  load404()
})

$(document).ready(function () {
  $('.defaultFragmentHolder').each(function () {
    var fragment = $(this).data('fragmentid')
    window.loadFragment(fragment)
  })

  router.resolve()
})

init()