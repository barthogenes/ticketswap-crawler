"use strict";

// Requires
const co = require("co");
const request = require("co-request");
const cheerio = require("cheerio");
const _ = require("lodash");
const exec = require("child_process").exec;
const clc = require("cli-color");

// APP SETTINGS
const CHECK_INTERVAL = 4;
const FOUND_INTERVAL = 21;
const ROBOT_INTERVAL = 1212;
const ERROR_INTERVAL = 2121;
const URLMAX_TIMEOUT = 2112;
const HOST = "https://www.ticketswap.com";
const EVENT_URL = '/event/paradigm-festival-2022/saturday-day/96f6ed53-561a-48ec-a390-71d28e072dd5/1585284';

// APP VARIABLES
let sleepTime;

// MAIN APP
const ticketCrawler = () => {
  return co(function* () {
    sleepTime = CHECK_INTERVAL;
    const result = yield buildRequest(HOST + EVENT_URL, "GET");
    const $ = cheerio.load(result.body);

    const data = JSON.parse($("#__NEXT_DATA__").html());

    const listings = Object.values(
      data.props.pageProps.initialApolloState
    ).filter((node) => node.__typename === "PublicListing");

    if (listings.length > 0) {
      print(
        clc.green.bold(
          `\n    ********************* ${listings.length} ticket(s) available! *******************`.toUpperCase()
        )
      );

      listings.forEach((listing) => {
        const amount = listing.numberOfTicketsInListing;
        const url = HOST + listing.uri.path;

        if (parseInt(amount) > 0) {
          botAction.availableTicket(url, amount);
        } else {
          botAction.reservedTicket(url, amount);
        }
      });
    } else {
      if ($("#recaptcha").length > 0) {
        botAction.robotCheck(HOST + EVENT_URL);
      } else if (data) {
        botAction.noTickets();
      } else {
        botAction.invalidURL(HOST + EVENT_URL);
      }
    }
    // Using 'sleep' keeps the execution in one single instance.
    sleep(sleepTime);
  }).catch((ex) => {
    print("Exception: " + ex);
    sleep(sleepTime);
  });
};

// BOT FUNCTIONS
const botAction = {
  availableTicket: (url, ticketAmmount) => {
    exec(`open ${url}`);
    sleepTime = FOUND_INTERVAL;

    const msg = `${ticketAmmount} ticket(s) available!:`.toUpperCase();

    print(clc.green(`${msg} \n${url}`));
    return false; // STOPS 'EACH 'LOOP
  },
  reservedTicket: (url, ticketAmmount) => {
    const msg = `${ticketAmmount} ticket(s) reserved:`.toUpperCase();

    print(clc.yellow(`${msg} \n${url}`));
  },
  noTickets: () => {
    print(clc.red(`No tickets available...`));
  },
  robotCheck: (url) => {
    sleepTime = ROBOT_INTERVAL;
    print(`Need to check captcha: \n${url}`);
  },
  invalidURL: (url) => {
    sleepTime = ERROR_INTERVAL;
    print(`Invalid URL: \n${url}`);
  },
};

// REQUEST FUNCTIONS
const cookieJar = request.jar();

const buildRequest = (uri, method) => {
  return request({
    uri: uri,
    method: method,
    jar: cookieJar,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36",
      "Cache-Control": "max-age=0",
    },
    timeout: URLMAX_TIMEOUT,
  });
};

// EXECUTION FUNCTIONS
const sleep = (seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000)).then(
    () => {
      ticketCrawler();
    }
  );
};

const print = (toPrint) => {
  console.log(`${new Date(Date.now()).toLocaleTimeString()} - ${toPrint}`);
};

// INITIALIZE
print(
  clc.cyan(`\n
    ************************************************************************
    Welcome to TicketSwap crawler!
    Searching for tickets for: ${EVENT_URL.split("/")[2]
      .replace(/-/g, " ")
      .toUpperCase()}
    ************************************************************************\n`)
);
ticketCrawler();
