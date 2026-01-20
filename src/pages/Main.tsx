import React, { useEffect, useMemo, useState, Fragment, useRef } from 'react'
import { getFlows, getMarketSummary, getNews, getMiniSeries, postChat, getAgentsPicks, postStrategySuggest, getWinningTrades, getTradingModes, validateTradingModes, logPickInteraction, logPickFeedback, updateMemory, getPortfolioMonitor, addWatchlistEntry, postAnalyze, getStrategyExits, getRlMetrics } from '../api'
import { BRANDING } from '../branding'
import { FyntrixLogo } from '../components/FyntrixLogo'
import { News } from '../components/Home/News'
import { PreferencesModal } from '../components/Home/PreferencesModal'
import { WatchlistModal } from '../components/Home/WatchlistModal'
import { AccountDropdown } from '../components/AccountDropdown'
import { AIResearchChat } from '../components/Home/AIResearchChat'
import { MarketBrief } from '../components/Home/MarketBrief'
import { computeSentimentRiskLevel } from '../sentimentRisk'
import { LayoutGrid, SlidersHorizontal, BriefcaseBusiness, Image, SquareActivity, Trophy, Copy, Bell, MessageCircle, Megaphone, User, Brain, MoreHorizontal, LogOut, Mail, CheckCircle, Menu, Phone } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ChartView } from '../components/ChartView'
import { MarketHeatMap } from '../components/MarketHeatMap'
import { AgentConsensus } from '../components/AgentConsensus'
import { InsightCards } from '../components/InsightCards'
import { ScalpingMonitor } from '../components/ScalpingMonitor'
import { ExitNotificationManager } from '../components/ExitNotification'
import { TradeStrategyPanel } from '../components/TradeStrategyPanel'
import LogoutConfirmModal from '../components/LogoutConfirmModal'
import type { Pick as AIPick } from '../types/picks'
import { classifyPickDirection, formatRecommendationLabel, getOptionType, isOptionPick, type PickDirection } from '../utils/recommendation'
// ProactiveChat removed - using single ARIS chat interface only
import { SupportChatModal } from '../components/SupportChatModal'
import { WinningTradesModal } from '../components/WinningTradesModal'
import { reportError } from '../utils/errorReporting'
import { formatIstDate, formatIstTime, isWithinLastTradingSessionIst as isWithinLastTradingSession, isWithinTodayIst } from '../utils/time'
import { LAYOUT_TOKENS, useBreakpoint } from '../utils/responsive'
import { useSwipeToClose } from '../utils/swipeToClose'
import { useFocusTrap } from '../utils/focusTrap'
import { getUserData, removeAccessToken, removeIdToken, removeRefreshToken, removeTokenExpiresAt, removeUserData } from '../utils/authStorage'

// Score-based color utility function
const getScoreColor = (score: number) => {
  if (score < 30) return '#ef4444'  // RED
  if (score < 50) return '#f97316'  // ORANGE
  if (score < 70) return '#3b82f6'  // BLUE
  return '#16a34a'  // GREEN
}

const isFallbackPick = (p: any) => {
  if (!p) return false
  // Backend marks deterministic pseudo-picks with a dedicated flag so we can
  // treat them as "no actionable setups" in the UI.
  if (p.deterministic === true) return true
  const rationale = typeof p.rationale === 'string' ? p.rationale : ''
  const keyFindings = typeof p.key_findings === 'string' ? p.key_findings : ''
  return rationale.startsWith('Fallback:') || keyFindings.startsWith('Fallback:')
}

const DEFAULT_AVAILABLE_MODES: any[] = [
  {
    value: 'Scalping',
    display_name: 'Scalping',
    description: 'Ultra-short-term scalping trades',
    horizon: 'Seconds to minutes',
  },
  {
    value: 'Intraday',
    display_name: 'Intraday',
    description: 'Same-day trading focus',
    horizon: 'Minutes to hours',
  },
  {
    value: 'Swing',
    display_name: 'Swing',
    description: 'Multi-day swing trades',
    horizon: 'Days to weeks',
  },
  {
    value: 'Options',
    display_name: 'Options',
    description: 'Options strategies on liquid names',
    horizon: 'Options positions',
  },
  {
    value: 'Futures',
    display_name: 'Futures',
    description: 'Index and stock futures',
    horizon: 'Futures positions',
  },
]

type TradeStrategyCacheEntry = {
  symbol: string
  plan: any
  explain: string[]
  scores?: any
  blendScore?: number
  strategyRationale?: string
  recommendation?: string
  agents?: any[]
}

const buildStrategyCacheKey = (
  symbol: string,
  primaryMode: string,
  risk: string,
  asOf?: string,
) => {
  let datePart = 'unknown'
  if (asOf) {
    const date = new Date(asOf)
    if (!Number.isNaN(date.getTime())) {
      datePart = date.toISOString().slice(0, 10)
    }
  }
  return `${symbol}|${primaryMode}|${risk}|${datePart}`
}

const DISCLOSURE_TEXT = `Discloser and Disclaimer
JK Securities Private Limited, (Hereinafter referred to as “JKSPL”) is regulated by the Securities and Exchange Board of India (“SEBI”) and is licensed to carry on the business of broking, depository services and related activities. The business of JKSPL and its Associates (list available on www.jksecurities.com) are organized in business of – Commodities and Financial Markets. This Report has been prepared by JK Securities Private Limited in the capacity of a Research Analyst having SEBI Registration No. INH000007289 and distributed as per SEBI (Research Analysts) Regulations 2014.
You agree and understand that the information and material contained in this website implies and constitutes your consent to the terms and conditions mentioned below.
You also agree that JKSPL can modify or alter the terms and conditions of the use of thisservice without any liability.
The content of the site and the interpretation of data are solely the personal views of the contributors. JKSPL reserves the right to make modifications and alterations to the content of the website. Users are advised to use the data for the purpose of information only and rely on their own judgment while making investment decisions. The investments discussed or recommended may not be suitable for all investors.
The market view and investment tips expressed on website are in no way a guarantee either express or implied. JKSPL does not guarantee the accuracy, adequacy or completeness of any information and is not responsible for any errors or omissions or for the results obtained from the use of such information. JKSPL especially states that it has no financial liability whatsoever to any user on account of the use of information provided on its website.
Trading is inherently risky and you agree to assume complete and full responsibility for the outcomes of all trading decisions that you make, including but not limited to loss of capital. None of the trading calls given by JKSPL should be construed as an offer to buy or sell any financial instruments, nor advice to do so. All comments and posts made by JKSPL and employees/owners are for information purposes only and under no circumstances should be used for actual trading. Under no circumstances should any person make trading decisions based solely on the information discussed herein. It is informational in nature.
We encourage all investors to use the information on the site as a resource only and should further do their own research on all featured companies, stocks, sectors, markets and information presented on the site. Nothing published on this site should be considered as investment advice.
JKSPL, its management, and/or their employees take no responsibility for the veracity, validity and the correctness of the recommendations or other information or research. Although we attempt to research thoroughly on information provided herein, there are no guarantees in accuracy. The information presented on the site has been gathered from various sources believed to be providing correct information. JKSPL, its management, and/or employees are not responsible for errors, inaccuracies if any in the content provided on the site. Any prediction made on the direction of the stock market or on the direction of individual stocks may prove to be incorrect. Users/visitors are expected to refer to other investment resources to verify the accuracy of the data posted on this site on their own.
JKSPL does not represent or endorse the accuracy or reliability of any of the information, conversation, or content contained on, distributed through, or linked, downloaded or accessed from any of the services contained on this website (hereinafter, the “Service”), nor the quality of any products, information or other materials displayed, purchased, or obtained by you as a result of any other information or offer by or in connection with the Service. All analyst commentary provided on this Website is for information purposes only.
The content of the website cannot be copied, reproduced, republished, uploaded, posted, transmitted or distributed for any non-personal use without obtaining prior permission from JKSPL. We reserve the right to terminate the accounts of subscribers/customers, who violate the proprietary rights, in addition to necessary legal action.
There are risks associated with utilizing internet and short messaging system (SMS) based information and research dissemination services. Subscribers are advised to understand that the services can fail due to failure of hardware, software, and Internet connection. While we ensure that the messages are delivered in time to the subscribers Mobile Network, the delivery of these messages to the customer’s mobile phone/handset is the responsibility of the customer’s Mobile Network. SMS may be delayed and/or not delivered to the customer’s mobile phone/handset on certain days, owing to technical reasons that can only be addressed by the customer’s Mobile Network, and JKSPL and its employees cannot be held responsible for the same in any case.
A possibility exists that the site could include inaccuracies or errors. Additionally, a possibility exist that unauthorized additions, deletions or alterations could be made by third parties to the site. Although JKSPL attempts to ensure the integrity, correctness and authenticity of the site, it makes no guarantees whatsoever as to its completeness, correctness or accuracy. In the event, that such an inaccuracy arises, please inform JKSPL so that it can be corrected.
JKSPL and its owners/affiliates are not liable for damages caused by any performance, failure of performance, error, omission, interruption, deletion, defect, delay in transmission or operations, computer virus, communications line failure, and unauthorized access to the personal accounts. JKSPL is not responsible for any technical failure or malfunctioning of the software or delays of any kind. We are also not responsible for non-receipt of registration details or e-mails. Users shall bear all responsibility of keeping the password secure. JKSPL is not responsible for the loss or misuse of the password.
JKSPL is not responsible for the content of any of the linked sites. By providing access to other websites, JKSPL is neither recommending nor endorsing the content available in the linked websites.
You agree that the information gathered from your profile will be used to enhance your experience on the website. We will not rent or sell the profile to any third party. In case of a contest or a promotion scheme, we reserve the right to share the users profile with the sponsors. In the event of necessary credit checks and collection of payments, JKSPL can disclose such information to other authorities in good faith.
This website is for the exclusive purpose of transactions to be carried out within the territorial jurisdiction of India and all such transactions shall be governed by the laws in India. Notice is hereby given that Non-Resident Indians (NRI's) and Foreign Nationals accessing this web site and opting to transact thereon shall do so after due verification at their end of their eligibility to do so. JKSPL undertakes no responsibility for such pre-eligibility of qualification on part of Non-Resident Indians (NRI's) or Foreign Nationals to transact on this website
DELAYS IN SERVICES:
Neither JKSPL (including its directors ,and/or employees, ) shall be liable for any loss or liability resulting, directly or indirectly, from delays or interruptions due to DND, electronic or mechanical equipment failures, telephone interconnect problems, defects, weather, strikes, walkouts, fire, acts of God, riots, armed conflicts, acts of war, or other like causes.
GOVERNING LAW:
Transactions between you and JKSPL shall be governed by and construed in accordance with the laws of India. Any litigation regarding this agreement or any transaction between customer and JKSPL or any action at law or in equity arising out of or relating to these agreement or transaction shall be filed only in the Competent Courts of Gujarat and the customer hereby agrees, consents and submits to the jurisdiction of such courts for the purpose of litigating any such action.
Exchanges Disclaimer:
No exchange* shall in any manner be answerable, responsible or liable to any person or persons for any acts of omission or commission, errors, mistakes and/or violation, actual or perceived, by us or our partners, agents, associates etc, of any of the Rules, Regulations, Bye-laws of any of the exchanges, SEBI Act or any other laws in force from time to time.
None of the exchanges are liable for any information on this Website or for any services rendered by us, our employees, and our servants.
* Exchanges here include all the Exchanges of which JKSPL is a Member currently or can become a member in future.
If you do not agree to any of the terms mentioned in this agreement, you should exit the site
STANDARD DISCLOSURES AS PER RESEARCH ANALYSTS REGULATIONS, 2014
DISCLAIMER/DISCLOSURES ANALYST CERTIFICATION
We/I, Mr. Prashant Baranpurkar Research Analysts, authors and the names subscribed to this report, of JK Securities Private Limited. hereby certify that all of the views expressed in this research report accurately reflect our views about the subject issuer(s) or securities. We also certify that no part of our compensation was, is, or will be directly or indirectly related to the specific recommendation(s) or view(s) in this report.
Terms & conditions and other disclosures:
JK Securities Private Limited, (hereinafter referred to as “JKSPL”) is engaged in the business of Stock Broking, and Depository Participant. This document has been prepared by the Research Division of JKSPL and is meant for use by the recipient only as information and is not for circulation. This document is not to be reported or copied or made available to others without prior permission of JKSPL. It should not be considered or taken as an offer to sell or a solicitation to buy or sell any security.
The information contained in this report has been obtained from sources that are considered to be reliable. However, JKSPL has not independently verified the accuracy or completeness of the same. Neither JKSPL nor any of its affiliates, its directors or its employees accepts any responsibility of whatsoever nature for the information, statements and opinion given, made available or expressed herein or for any omission therein.
Recipients of this report should be aware that past performance is not necessarily a guide to future performance and value of investments can go down as well. The suitability or otherwise of any investments will depend upon the recipient's particular circumstances and, in case of doubt, advice should be sought from an independent expert/advisor.
Either JKSPL or its affiliates or its directors or its employees or its representatives or its clients or their relatives may have position(s), make market, act as principal or engage in transactions of securities of companies referred to in this report and they may have used the research material prior to publication.
JKSPL submits that no material disciplinary action has been taken on us by any Regulatory Authority impacting Equity Research Analysis activities.
JKSPL or its research analysts or its associates or his relatives do not have any financial interest in the subject company. JKSPL or its research analysts or its associates or his relatives do not have actual/beneficial ownership of one per cent or more securities of the subject company at the end of the month immediately preceding the date of publication of the research report. JKSPL or its research analysts or its associates or his relatives do not have any material conflict of interest at the time of publication of the research report.
JKSPL or its associates have not received any compensation from the subject company in the past twelve months.
JKSPL or its associates have not managed or co‐managed public offering of securities for the subject company in the past twelve months or mandated by the subject company for any other assignment in the past twelve months.
JKSPL or its associates have not received any compensation for brokerage services from the subject company in the past twelve months.
JKSPL or its associates have not received any compensation for products or services other than investment banking or merchant banking or brokerage services from the subject company in the past twelve months. JKSPL or its associates have not received any compensation or other benefits from the subject company or third party in connection with the research report.
JKSPL encourages independence in research report preparation and strives to minimize conflict in preparation of research report. JKSPL or its analysts did not receive any compensation or other benefits from the subject Company or third party in connection with the preparation of the research report. JKSPL or its Research Analysts do not have any material conflict of interest at the time of publication of this report.
It is confirmed that Mr. Prashant Prafulchandra Buranpurkar Research Analysts of this report have not received any compensation from the companies mentioned in the report in the preceding twelve months.
Compensation of our Research Analysts is not based on any specific merchant banking, investment banking or brokerage service transactions. The Research analysts for this report certifies that all of the views expressed in this report accurately reflect his or her personal views about the subject company or companies and its or their securities, and no part of his or her compensation was, is or will be, directly or indirectly related to specific recommendations or views expressed in this report. The research analysts for this report has not served as an officer, director or employee of the subject company.
JKSPL or its research analysts have not engaged in market making activity for the subject company Our sales people, traders, and other professionals or affiliates may provide oral or written market commentary or trading strategies to our clients that reflect opinions that are contrary to the opinions expressed herein, and our proprietary trading and investing businesses may make investment decisions that are inconsistent with the recommendations expressed herein. In reviewing these materials, you should be aware that any or all the foregoing, among other things, may give rise to real or potential conflicts of interest.
JKSPL and its associates, their directors and employees may (a) from time to time, have a long or short position in, and buy or sell the securities of the subject company or (b) be engaged in any other transaction involving such securities and earn brokerage or other compensation or act as a market maker in the financial instruments of the subject company or act as an advisor or lender/borrower to the subject company or may have any other potential conflict of interests with respect to any recommendation and other related information and opinions.
JKSPL does not claim to be an invitation or an offer to buy or sell any financial instrument. Our Clients (Paid Or Unpaid), Any third party or anyone else have no rights to forward or share our calls or SMS or Reports or Any Information Provided by us to/with anyone which is received directly or indirectly by them. If found so then Serious Legal Actions can be taken. By accessing Www.jksecurities.com or any of its associate/group sites, you have read, understood and agree to be legally bound by the terms of the following disclaimer and user agreement. The views and investment tips expressed by investment experts through sms or on Www.jksecurities.com are their own, and not that of the website or its management. Www.jksecurities.com advises users to check with certified experts before taking any investment decision.
Stock trading is inherently risky and you agree to assume complete and full responsibility for the outcomes of all trading decisions that you make, including but not limited to loss of capital. None of the stock trading calls made by Www.jksecurities.com should be construed as an offer to buy or sell securities, nor advice to do so. All comments and posts made by Www.jksecurities.com, and employees/owners are for information purposes only and under no circumstances should be used for actual trading. Under no circumstances should any person at this site make trading decisions based solely on the information discussed herein. You agree to not make actual stock trades based on comments on the site, nor on any techniques presented nor discussed in this site or any other form of information presentation. All information is for educational and informational use only. You agree to consult with a registered investment advisor, prior to making any trading decision of any kind. You agree, by accessing this or any associated site, Www.jksecurities.com bears no liability for any postings on the website or actions of associate site. We reserve the right to deny service to anyone. You, and not Www.jksecurities.com, assume the entire cost and risk of any trading you are suggested to undertake. You are solely responsible for making your own investment decisions. If you choose to engage in such transactions with or without seeking advice from a licensed and qualified financial advisor or entity, then such decision and any consequences flowing there from are your sole responsibility. The information and commentaries are not meant to be an endorsement or offering of any stock purchase. They are meant to be a guide only, which must be tempered by the investment experience and independent decision-making process of the subscriber. Www.jksecurities.com or any employees are in no way liable for the use of the information by others in investing or trading in investment vehicles utilizing the principles disclosed herein. The materials and information in, and provided by, this site is not, and should not be construed as an offer to buy or sell any of the securities named in materials, services, or on-line postings.
We encourage all investors to use the information on the site as a resource only to further their own research on all featured companies, stocks, sectors, markets and information presented on the site.`

const TRADESURF_DISCLOSURE_TEXT = `Discloser and Disclaimer
Tradesurf Ventures Private Limited, (Hereinafter referred to as "TRADESURF") is regulated by the Securities and Exchange Board of India ("SEBI") and is licensed to carry on the business of broking, depository services and related activities. The business of TRADESURF and its Associates (list available on www.LiquiLogic.in) are organized in business of – Commodities and Financial Markets. This Report has been prepared by Tradesurf Ventures Private Limited in the capacity of a Research Analyst having SEBI Registration No. INHXXXXXXXXX and distributed as per SEBI (Research Analysts) Regulations 2014.
You agree and understand that the information and material contained in this website implies and constitutes your consent to the terms and conditions mentioned below.
You also agree that TRADESURF can modify or alter the terms and conditions of the use of this service without any liability.
The content of the site and the interpretation of data are solely the personal views of the contributors. TRADESURF reserves the right to make modifications and alterations to the content of the website. Users are advised to use the data for the purpose of information only and rely on their own judgment while making investment decisions. The investments discussed or recommended may not be suitable for all investors.
The market view and investment tips expressed on website are in no way a guarantee either express or implied. TRADESURF does not guarantee the accuracy, adequacy or completeness of any information and is not responsible for any errors or omissions or for the results obtained from the use of such information. TRADESURF especially states that it has no financial liability whatsoever to any user on account of the use of information provided on its website.
Trading is inherently risky and you agree to assume complete and full responsibility for the outcomes of all trading decisions that you make, including but not limited to loss of capital. None of the trading calls given by TRADESURF should be construed as an offer to buy or sell any financial instruments, nor advice to do so. All comments and posts made by TRADESURF and employees/owners are for information purposes only and under no circumstances should be used for actual trading. Under no circumstances should any person make trading decisions based solely on the information discussed herein. It is informational in nature.
We encourage all investors to use the information on the site as a resource only and should further do their own research on all featured companies, stocks, sectors, markets and information presented on the site. Nothing published on this site should be considered as investment advice.
TRADESURF, its management, and/or their employees take no responsibility for the veracity, validity and the correctness of the recommendations or other information or research. Although we attempt to research thoroughly on information provided herein, there are no guarantees in accuracy. The information presented on the site has been gathered from various sources believed to be providing correct information. TRADESURF, its management, and/or employees are not responsible for errors, inaccuracies if any in the content provided on the site. Any prediction made on the direction of the stock market or on the direction of individual stocks may prove to be incorrect. Users/visitors are expected to refer to other investment resources to verify the accuracy of the data posted on this site on their own.
TRADESURF does not represent or endorse the accuracy or reliability of any of the information, conversation, or content contained on, distributed through, or linked, downloaded or accessed from any of the services contained on this website (hereinafter, the "Service"), nor the quality of any products, information or other materials displayed, purchased, or obtained by you as a result of any other information or offer by or in connection with the Service. All analyst commentary provided on this Website is for information purposes only.
The content of the website cannot be copied, reproduced, republished, uploaded, posted, transmitted or distributed for any non-personal use without obtaining prior permission from TRADESURF. We reserve the right to terminate the accounts of subscribers/customers, who violate the proprietary rights, in addition to necessary legal action.
There are risks associated with utilizing internet and short messaging system (SMS) based information and research dissemination services. Subscribers are advised to understand that the services can fail due to failure of hardware, software, and Internet connection. While we ensure that the messages are delivered in time to the subscribers Mobile Network, the delivery of these messages to the customer’s mobile phone/handset is the responsibility of the customer’s Mobile Network. SMS may be delayed and/or not delivered to the customer’s mobile phone/handset on certain days, owing to technical reasons that can only be addressed by the customer’s Mobile Network, and TRADESURF and its employees cannot be held responsible for the same in any case.
A possibility exists that the site could include inaccuracies or errors. Additionally, a possibility exist that unauthorized additions, deletions or alterations could be made by third parties to the site. Although TRADESURF attempts to ensure the integrity, correctness and authenticity of the site, it makes no guarantees whatsoever as to its completeness, correctness or accuracy. In the event, that such an inaccuracy arises, please inform TRADESURF so that it can be corrected.
TRADESURF and its owners/affiliates are not liable for damages caused by any performance, failure of performance, error, omission, interruption, deletion, defect, delay in transmission or operations, computer virus, communications line failure, and unauthorized access to the personal accounts. TRADESURF is not responsible for any technical failure or malfunctioning of the software or delays of any kind. We are also not responsible for non-receipt of registration details or e-mails. Users shall bear all responsibility of keeping the password secure. TRADESURF is not responsible for the loss or misuse of the password.
TRADESURF is not responsible for the content of any of the linked sites. By providing access to other websites, TRADESURF is neither recommending nor endorsing the content available in the linked websites.
You agree that the information gathered from your profile will be used to enhance your experience on the website. We will not rent or sell the profile to any third party. In case of a contest or a promotion scheme, we reserve the right to share the users profile with the sponsors. In the event of necessary credit checks and collection of payments, TRADESURF can disclose such information to other authorities in good faith.
This website is for the exclusive purpose of transactions to be carried out within the territorial jurisdiction of India and all such transactions shall be governed by the laws in India. Notice is hereby given that Non-Resident Indians (NRI's) and Foreign Nationals accessing this web site and opting to transact thereon shall do so after due verification at their end of their eligibility to do so. TRADESURF undertakes no responsibility for such pre-eligibility of qualification on part of Non-Resident Indians (NRI's) or Foreign Nationals to transact on this website
DELAYS IN SERVICES:
Neither TRADESURF (including its directors, and/or employees,) shall be liable for any loss or liability resulting, directly or indirectly, from delays or interruptions due to DND, electronic or mechanical equipment failures, telephone interconnect problems, defects, weather, strikes, walkouts, fire, acts of God, riots, armed conflicts, acts of war, or other like causes.
GOVERNING LAW:
Transactions between you and TRADESURF shall be governed by and construed in accordance with the laws of India. Any litigation regarding this agreement or any transaction between customer and TRADESURF or any action at law or in equity arising out of or relating to these agreement or transaction shall be filed only in the Competent Courts of Gujarat and the customer hereby agrees, consents and submits to the jurisdiction of such courts for the purpose of litigating any such action.
Exchanges Disclaimer:
No exchange* shall in any manner be answerable, responsible or liable to any person or persons for any acts of omission or commission, errors, mistakes and/or violation, actual or perceived, by us or our partners, agents, associates etc, of any of the Rules, Regulations, Bye-laws of any of the exchanges, SEBI Act or any other laws in force from time to time.
None of the exchanges are liable for any information on this Website or for any services rendered by us, our employees, and our servants.
* Exchanges here include all the Exchanges of which TRADESURF is a Member currently or can become a member in future.
If you do not agree to any of the terms mentioned in this agreement, you should exit the site
STANDARD DISCLOSURES AS PER RESEARCH ANALYSTS REGULATIONS, 2014
DISCLAIMER/DISCLOSURES ANALYST CERTIFICATION
We/I, Mr. Devendra Gosar Research Analysts, authors and the names subscribed to this report, of Tradesurf Ventures Private Limited. hereby certify that all of the views expressed in this research report accurately reflect our views about the subject issuer(s) or securities. We also certify that no part of our compensation was, is, or will be directly or indirectly related to the specific recommendation(s) or view(s) in this report.
Terms & conditions and other disclosures:
Tradesurf Ventures Private Limited, (hereinafter referred to as "TRADESURF") is engaged in the business of Stock Broking, and Depository Participant. This document has been prepared by the Research Division of TRADESURF and is meant for use by the recipient only as information and is not for circulation. This document is not to be reported or copied or made available to others without prior permission of TRADESURF. It should not be considered or taken as an offer to sell or a solicitation to buy or sell any security.
The information contained in this report has been obtained from sources that are considered to be reliable. However, TRADESURF has not independently verified the accuracy or completeness of the same. Neither TRADESURF nor any of its affiliates, its directors or its employees accepts any responsibility of whatsoever nature for the information, statements and opinion given, made available or expressed herein or for any omission therein.
Recipients of this report should be aware that past performance is not necessarily a guide to future performance and value of investments can go down as well. The suitability or otherwise of any investments will depend upon the recipient's particular circumstances and, in case of doubt, advice should be sought from an independent expert/advisor.
Either TRADESURF or its affiliates or its directors or its employees or its representatives or its clients or their relatives may have position(s), make market, act as principal or engage in transactions of securities of companies referred to in this report and they may have used the research material prior to publication.
TRADESURF submits that no material disciplinary action has been taken on us by any Regulatory Authority impacting Equity Research Analysis activities.
TRADESURF or its research analysts or its associates or his relatives do not have any financial interest in the subject company. TRADESURF or its research analysts or its associates or his relatives do not have actual/beneficial ownership of one per cent or more securities of the subject company at the end of the month immediately preceding the date of publication of the research report. TRADESURF or its research analysts or its associates or his relatives do not have any material conflict of interest at the time of publication of the research report.
TRADESURF or its associates have not received any compensation from the subject company in the past twelve months.
TRADESURF or its associates have not managed or co‐managed public offering of securities for the subject company in the past twelve months or mandated by the subject company for any other assignment in the past twelve months.
TRADESURF or its associates have not received any compensation for brokerage services from the subject company in the past twelve months.
TRADESURF or its associates have not received any compensation for products or services other than investment banking or merchant banking or brokerage services from the subject company in the past twelve months. TRADESURF or its associates have not received any compensation or other benefits from the subject company or third party in connection with the research report.
TRADESURF encourages independence in research report preparation and strives to minimize conflict in preparation of research report. TRADESURF or its analysts did not receive any compensation or other benefits from the subject Company or third party in connection with the preparation of the research report. TRADESURF or its Research Analysts do not have any material conflict of interest at the time of publication of this report.
It is confirmed that Mr. Devendra Gosar Research Analyst of this report have not received any compensation from the companies mentioned in the report in the preceding twelve months.
Compensation of our Research Analysts is not based on any specific merchant banking, investment banking or brokerage service transactions. The Research analysts for this report certifies that all of the views expressed in this report accurately reflect his or her personal views about the subject company or companies and its or their securities, and no part of his or her compensation was, is or will be, directly or indirectly related to specific recommendations or views expressed in this report. The research analysts for this report has not served as an officer, director or employee of the subject company.
TRADESURF or its research analysts have not engaged in market making activity for the subject company Our sales people, traders, and other professionals or affiliates may provide oral or written market commentary or trading strategies to our clients that reflect opinions that are contrary to the opinions expressed herein, and our proprietary trading and investing businesses may make investment decisions that are inconsistent with the recommendations expressed herein. In reviewing these materials, you should be aware that any or all the foregoing, among other things, may give rise to real or potential conflicts of interest.
TRADESURF and its associates, their directors and employees may (a) from time to time, have a long or short position in, and buy or sell the securities of the subject company or (b) be engaged in any other transaction involving such securities and earn brokerage or other compensation or act as a market maker in the financial instruments of the subject company or act as an advisor or lender/borrower to the subject company or may have any other potential conflict of interests with respect to any recommendation and other related information and opinions.
TRADESURF does not claim to be an invitation or an offer to buy or sell any financial instrument. Our Clients (Paid Or Unpaid), Any third party or anyone else have no rights to forward or share our calls or SMS or Reports or Any Information Provided by us to/with anyone which is received directly or indirectly by them. If found so then Serious Legal Actions can be taken. By accessing Www.LiquiLogic.in or any of its associate/group sites, you have read, understood and agree to be legally bound by the terms of the following disclaimer and user agreement. The views and investment tips expressed by investment experts through sms or on Www.LiquiLogic.in are their own, and not that of the website or its management. Www.LiquiLogic.in advises users to check with certified experts before taking any investment decision.
Stock trading is inherently risky and you agree to assume complete and full responsibility for the outcomes of all trading decisions that you make, including but not limited to loss of capital. None of the stock trading calls made by Www.LiquiLogic.in should be construed as an offer to buy or sell securities, nor advice to do so. All comments and posts made by Www.LiquiLogic.in, and employees/owners are for information purposes only and under no circumstances should be used for actual trading. Under no circumstances should any person at this site make trading decisions based solely on the information discussed herein. You agree to not make actual stock trades based on comments on the site, nor on any techniques presented nor discussed in this site or any other form of information presentation. All information is for educational and informational use only. You agree to consult with a registered investment advisor, prior to making any trading decision of any kind. You agree, by accessing this or any associated site, Www.LiquiLogic.in bears no liability for any postings on the website or actions of associate site. We reserve the right to deny service to anyone. You, and not Www.LiquiLogic.in, assume the entire cost and risk of any trading you are suggested to undertake. You are solely responsible for making your own investment decisions. If you choose to engage in such transactions with or without seeking advice from a licensed and qualified financial advisor or entity, then such decision and any consequences flowing there from are your sole responsibility. The information and commentaries are not meant to be an endorsement or offering of any stock purchase. They are meant to be a guide only, which must be tempered by the investment experience and independent decision-making process of the subscriber. Www.LiquiLogic.in or any employees are in no way liable for the use of the information by others in investing or trading in investment vehicles utilizing the principles disclosed herein. The materials and information in, and provided by, this site is not, and should not be construed as an offer to buy or sell any of the securities named in materials, services, or on-line postings.
We encourage all investors to use the information on the site as a resource only to further their own research on all featured companies, stocks, sectors, markets and information presented on the site.`

type ChatLayout = 'left-fixed' | 'bottom-docked'

type MobileNavTab = 'portfolio' | 'watchlist' | 'home' | 'winners' | 'more'

export default function App() {
  try { dayjs.extend(relativeTime) } catch { }
  const [market, setMarket] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('arise_market')
      if (!raw) return { indices: [] }
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
      return { indices: [] }
    } catch {
      return { indices: [] }
    }
  })
  const [flows, setFlows] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('arise_flows')
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  })
  const [asOf, setAsOf] = useState<string>(() => {
    try {
      return localStorage.getItem('arise_market_asof') || ''
    } catch {
      return ''
    }
  })
  const [news, setNews] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('arise_news')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
      if (parsed && Array.isArray(parsed.items)) return parsed.items
      return []
    } catch {
      return []
    }
  })
  const [newsAsOf, setNewsAsOf] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('arise_news')
      if (!raw) return ''
      const parsed = JSON.parse(raw)
      return typeof parsed?.as_of === 'string' ? parsed.as_of : ''
    } catch {
      return ''
    }
  })
  const [newsExpanded, setNewsExpanded] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [eventsAsOf, setEventsAsOf] = useState<string>('')
  const [spark, setSpark] = useState<Record<string, number[]>>(() => {
    try {
      const raw = localStorage.getItem('arise_spark')
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
      return {}
    } catch {
      return {}
    }
  })
  const [tip, setTip] = useState<{ x: number, y: number, text: string, type?: string } | null>(null)
  const [tipTimer, setTipTimer] = useState<any>(null)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showWatchlist, setShowWatchlist] = useState(false)
  const [showAgents, setShowAgents] = useState(false)
  const [showCompany, setShowCompany] = useState(false)
  const [showProducts, setShowProducts] = useState(false)
  const [disclosureAccepted, setDisclosureAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('arise_disclosure_accepted_v1') === '1'
    } catch {
      return false
    }
  })
  const [showDisclosure, setShowDisclosure] = useState<boolean>(() => {
    try {
      return localStorage.getItem('arise_disclosure_accepted_v1') === '1' ? false : true
    } catch {
      return true
    }
  })
  const [showWinningTrades, setShowWinningTrades] = useState(false)
  const [winningTradesData, setWinningTradesData] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('arise_winning_trades')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [loadingWinningTrades, setLoadingWinningTrades] = useState(false)
  const [winningTradesMode, setWinningTradesMode] = useState<string>('All') // Filter by trading mode
  const [winningTradesDate, setWinningTradesDate] = useState<string>('all') // Filter by date
  const [strategyExitsByDate, setStrategyExitsByDate] = useState<Record<string, any>>({})
  const [showRlMetrics, setShowRlMetrics] = useState(false)
  const [rlMetricsData, setRlMetricsData] = useState<any | null>(null)
  const [rlDailyData, setRlDailyData] = useState<any[] | null>(null)
  const [loadingRlMetrics, setLoadingRlMetrics] = useState(false)
  const [rlMetricsError, setRlMetricsError] = useState<string | null>(null)
  const winningStrategiesData = winningTradesData
  const winningTradesAvailableDates = useMemo<string[]>(() => {
    const recs = winningTradesData?.recommendations
    if (!Array.isArray(recs) || recs.length === 0) return []

    const set = new Set<string>()
    for (const r of recs) {
      if (r && typeof r.recommended_date === 'string' && r.recommended_date) {
        set.add(r.recommended_date)
      }
    }

    // Sort most recent first (YYYY-MM-DD string compare works for ISO dates)
    return Array.from(set).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
  }, [winningTradesData])

  useEffect(() => {
    if (!showWinningTrades) return
    const dates = winningTradesAvailableDates
    if (!dates || dates.length === 0) return
    setWinningTradesDate(prev => {
      if (prev === 'all') return dates[0]
      if (!dates.includes(prev)) return dates[0]
      return prev
    })
  }, [showWinningTrades, winningTradesAvailableDates])

  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false)
  const [isAboutMenuOpen, setIsAboutMenuOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [accountProfile, setAccountProfile] = useState<{ name: string; account_id: string }>(() => {
    try {
      const raw = localStorage.getItem('arise_account_profile_v1')
      if (!raw) return { name: '', account_id: '' }
      const parsed = JSON.parse(raw)
      return {
        name: typeof parsed?.name === 'string' ? parsed.name : '',
        account_id: typeof parsed?.account_id === 'string' ? parsed.account_id : '',
      }
    } catch {
      return { name: '', account_id: '' }
    }
  })
  const [portfolioMonitor, setPortfolioMonitor] = useState<any | null>(null)
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)
  const [watchlistMonitor, setWatchlistMonitor] = useState<any | null>(null)
  const [loadingWatchlist, setLoadingWatchlist] = useState(false)
  const [loadingWatchlistEntriesAll, setLoadingWatchlistEntriesAll] = useState(false)
  const [watchlistEntriesAll, setWatchlistEntriesAll] = useState<any[]>([])
  const [watchlistShowAllEntries, setWatchlistShowAllEntries] = useState(false)
  const [watchlistExpanded, setWatchlistExpanded] = useState<Record<string, boolean>>({})
  const [watchlistMutatingId, setWatchlistMutatingId] = useState<string | null>(null)
  const [watchlistTooltip, setWatchlistTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const [showScalpingMonitor, setShowScalpingMonitor] = useState(false) // Scalping Monitor
  const [scalpingMonitorRefreshToken, setScalpingMonitorRefreshToken] = useState(0)
  const [scalpingWsExits, setScalpingWsExits] = useState<any[]>([])
  const [picks, setPicks] = useState<AIPick[]>([])
  const [picksAsOf, setPicksAsOf] = useState<string>('')
  const [showPicks, setShowPicks] = useState(false)
  const [loadingPicks, setLoadingPicks] = useState(false)
  const [analyze, setAnalyze] = useState<{
    symbol: string
    plan: any
    explain: string[]
    scores?: any
    blendScore?: number
    strategyRationale?: string
    recommendation?: string
    agents?: any[]
  } | null>(null)
  const [explainPick, setExplainPick] = useState<string | null>(null) // Symbol to show explanation for
  const [chartView, setChartView] = useState<{ symbol: string, analysis?: AIPick } | null>(null) // Chart view state
  const [universe, setUniverse] = useState<string>(() => {
    try { return localStorage.getItem('arise_universe') || 'NIFTY50' } catch { return 'NIFTY50' }
  })
  const [marketRegion, setMarketRegion] = useState<'India' | 'Global'>(() => {
    try { return (localStorage.getItem('arise_market_region') as any) || 'India' } catch { return 'India' }
  })

  // Trade preferences
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [risk, setRisk] = useState<'Aggressive' | 'Moderate' | 'Conservative'>(() => {
    try { return (localStorage.getItem('arise_risk') as any) || 'Moderate' } catch { return 'Moderate' }
  })
  const [modes, setModes] = useState<Record<string, boolean>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('arise_modes') || 'null') as any
      if (stored) {
        if (stored.Delivery && stored.Swing == null) {
          stored.Swing = stored.Delivery
        }
        delete stored.Delivery
        return stored
      }
      return { Intraday: true, Swing: true, Options: false, Futures: false, Commodity: false }
    } catch {
      return { Intraday: true, Swing: true, Options: false, Futures: false, Commodity: false }
    }
  })

  // NEW: Primary trading mode system
  const [availableModes, setAvailableModes] = useState<any[]>(DEFAULT_AVAILABLE_MODES)
  const [primaryMode, setPrimaryMode] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('arise_primary_mode')
      if (!stored) return 'Swing'
      if (stored === 'Delivery' || stored === 'Positional') return 'Swing'
      return stored
    } catch { return 'Swing' }
  })
  const [auxiliaryModes, setAuxiliaryModes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('arise_auxiliary_modes') || '[]') } catch { return [] }
  })
  const [picksData, setPicksData] = useState<any>(null) // Full picks response with mode info
  const [picksSystemMessage, setPicksSystemMessage] = useState<string>('')

  // NEW: State for advanced UI components
  const [showHeatMap, setShowHeatMap] = useState(true) // Show heat map by default
  const [insights, setInsights] = useState<any[]>([]) // Smart insight cards
  const [dismissedInsightIds, setDismissedInsightIds] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('arise_dismissed_insights_v1')
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  })
  // proactiveMessages removed - using single ARIS chat only

  // Live tick prices from WebSocket (by symbol)
  const [livePrices, setLivePrices] = useState<Record<string, { last_price: number; change_percent?: number; volume?: number; updated_at?: string }>>({})
  const wsRef = useRef<WebSocket | null>(null)
  const subscribedSymbolsRef = useRef<Set<string>>(new Set())
  const symbolRefCountsRef = useRef<Record<string, number>>({})
  // Trade Strategy cache (in-memory + persisted in localStorage)
  const strategyCacheRef = useRef<Record<string, TradeStrategyCacheEntry>>({})
  const strategyCacheLoadedRef = useRef(false)
  const prefetchedStrategyKeysRef = useRef<Set<string>>(new Set())

  const ensureStrategyCacheLoaded = () => {
    if (strategyCacheLoadedRef.current) return
    strategyCacheLoadedRef.current = true
    try {
      const raw = localStorage.getItem('arise_strategy_cache_v1')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        strategyCacheRef.current = parsed as Record<string, TradeStrategyCacheEntry>
      }
    } catch {
      // Ignore cache load errors
    }
  }

  const persistStrategyCache = () => {
    try {
      localStorage.setItem('arise_strategy_cache_v1', JSON.stringify(strategyCacheRef.current))
    } catch {
      // Ignore cache persist errors
    }
  }

  useEffect(() => { document.body.style.background = '#ffffff'; document.body.style.color = '#0b0f14' }, [])

  const cleanNewsList = (items: any[]): any[] => {
    try {
      return items.filter((n: any) => {
        const titleRaw = (n && n.title != null ? String(n.title) : '').trim()
        const descRaw = (n && n.description != null ? String(n.description) : '').trim()
        const sourceRaw = (n && n.source != null ? String(n.source) : '').toLowerCase()
        if (!titleRaw) return false
        const lowerTitle = titleRaw.toLowerCase()
        const yahooCategoryStubs = [
          'sports',
          'finance',
          'entertainment',
          'lifestyle',
        ]
        if (sourceRaw.includes('yahoo') && yahooCategoryStubs.includes(lowerTitle)) {
          return false
        }
        if (sourceRaw.includes('yahoo') && !descRaw && titleRaw.split(/\s+/).length <= 3) {
          return false
        }
        if (titleRaw.length < 8 && !descRaw) {
          return false
        }
        return true
      })
    } catch {
      return items
    }
  }

  const handleHomeClick = React.useCallback(() => {
    setPrefsOpen(false)
    setShowPortfolio(false)
    setShowWatchlist(false)
    setShowAgents(false)
    setShowPicks(false)
    setAnalyze(null)
    setTip(null)
    setChartView(null)
    setShowScalpingMonitor(false)
    setChat([])
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      // ignore scroll errors (e.g., non-browser environment)
    }
    if (disclosureAccepted) setShowDisclosure(false)
  }, [disclosureAccepted])

  const openWinners = React.useCallback(async () => {
    setShowWinningTrades(true)
    try {
      setLoadingWinningTrades(true)
      const data = await getWinningTrades({ lookback_days: 7, universe: universe.toLowerCase() })
      setWinningTradesData(data)
      try {
        localStorage.setItem('arise_winning_trades', JSON.stringify(data))
      } catch { }
    } catch (e) {
      reportError(e, { feature: 'winners', action: 'load_winning_trades', extra: { universe } })
    } finally {
      setLoadingWinningTrades(false)
    }
  }, [universe])

  const openRl = React.useCallback(async () => {
    setShowRlMetrics(true)
    setRlMetricsError(null)
    try {
      setLoadingRlMetrics(true)
      const [daily, policy] = await Promise.all([
        getRlMetrics({ view: 'daily' }),
        getRlMetrics({ view: 'policy' }),
      ])
      setRlDailyData(Array.isArray(daily?.daily) ? daily.daily : null)
      setRlMetricsData(policy)
    } catch (e) {
      reportError(e, { feature: 'rl', action: 'load_metrics' })
      setRlMetricsError('Failed to load RL metrics')
    } finally {
      setLoadingRlMetrics(false)
    }
  }, [])

  const openChat = React.useCallback(() => {
    try {
      const input = document.querySelector('input[placeholder="Ask Fyntrix…"]') as HTMLInputElement | null
      if (input) {
        try {
          input.scrollIntoView({ block: 'center', behavior: 'smooth' })
        } catch { }
        input.focus()
      }
    } catch { }
  }, [])

  // Load trading modes on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await getTradingModes()
        const modes = Array.isArray((data as any)?.modes) ? (data as any).modes : []
        if (modes.length > 0) {
          setAvailableModes(modes)
        } else {
          setAvailableModes(DEFAULT_AVAILABLE_MODES)
        }
      } catch (err) {
        reportError(err, { feature: 'preferences', action: 'load_trading_modes' })
        setAvailableModes(DEFAULT_AVAILABLE_MODES)
      }
    })()
  }, [])

  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'sm'

  const [activeMobileTab, setActiveMobileTab] = useState<MobileNavTab>('home')

  const scrollLockRef = useRef<{
    scrollY: number
    overflow: string
    position: string
    top: string
    width: string
  } | null>(null)

  const topPicksDialogRef = useRef<HTMLElement | null>(null)
  const topPicksCloseRef = useRef<HTMLButtonElement | null>(null)
  const winnersDialogRef = useRef<HTMLDivElement | null>(null)
  const winnersCloseRef = useRef<HTMLButtonElement | null>(null)
  const moreDialogRef = useRef<HTMLDivElement | null>(null)
  const moreCloseRef = useRef<HTMLButtonElement | null>(null)
  const accountDialogRef = useRef<HTMLDivElement | null>(null)
  const accountCloseRef = useRef<HTMLButtonElement | null>(null)

  useFocusTrap({
    enabled: Boolean(isMobile && showPicks),
    containerRef: topPicksDialogRef,
    initialFocusRef: topPicksCloseRef,
    onEscape: () => {
      setShowPicks(false)
      setShowHeatMap(true)
    },
  })

  useFocusTrap({
    enabled: Boolean(showWinningTrades),
    containerRef: winnersDialogRef,
    initialFocusRef: winnersCloseRef,
    onEscape: () => setShowWinningTrades(false),
  })

  useFocusTrap({
    enabled: Boolean(isMobile && isMoreOpen),
    containerRef: moreDialogRef,
    initialFocusRef: moreCloseRef,
    onEscape: () => setIsMoreOpen(false),
  })

  useFocusTrap({
    enabled: Boolean(isAccountOpen),
    containerRef: accountDialogRef,
    initialFocusRef: accountCloseRef,
    onEscape: () => setIsAccountOpen(false),
  })

  const shouldLockBackgroundScroll =
    isMobile &&
    (showPicks ||
      showWinningTrades ||
      isMoreOpen ||
      Boolean(chartView) ||
      isSupportChatOpen ||
      isAccountOpen)

  useEffect(() => {
    if (!shouldLockBackgroundScroll) {
      if (scrollLockRef.current) {
        const prev = scrollLockRef.current
        scrollLockRef.current = null
        document.body.style.overflow = prev.overflow
        document.body.style.position = prev.position
        document.body.style.top = prev.top
        document.body.style.width = prev.width
        try {
          window.scrollTo(0, prev.scrollY)
        } catch { }
      }
      return
    }

    if (scrollLockRef.current) return

    const scrollY = window.scrollY || 0
    scrollLockRef.current = {
      scrollY,
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      const prev = scrollLockRef.current
      scrollLockRef.current = null
      if (!prev) return
      document.body.style.overflow = prev.overflow
      document.body.style.position = prev.position
      document.body.style.top = prev.top
      document.body.style.width = prev.width
      try {
        window.scrollTo(0, prev.scrollY)
      } catch { }
    }
  }, [shouldLockBackgroundScroll])

  useEffect(() => {
    if (!isMobile) return
    if (showPicks) {
      setActiveMobileTab('home')
      return
    }
    if (showWinningTrades) {
      setActiveMobileTab('winners')
      return
    }
    if (showWatchlist) {
      setActiveMobileTab('watchlist')
      return
    }
  }, [isMobile, showPicks, showWinningTrades, showWatchlist])

  const watchlistCount = useMemo(() => {
    try {
      if (!watchlistMonitor) return 0
      const entries = (watchlistMonitor as any).entries
      if (Array.isArray(entries)) return entries.length
      const summaryEntries = (watchlistMonitor as any)?.summary?.entries
      if (typeof summaryEntries === 'number') return summaryEntries
      return 0
    } catch {
      return 0
    }
  }, [watchlistMonitor])

  const winnersIsLive = useMemo(() => {
    try {
      if (!winningTradesData?.as_of) return false
      const now = new Date()
      const nowIst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
      const day = nowIst.getDay()
      const isWeekday = day >= 1 && day <= 5
      const hours = nowIst.getHours()
      const minutes = nowIst.getMinutes()
      const currentTime = hours * 60 + minutes
      const marketOpen = 9 * 60 + 15
      const marketClose = 15 * 60 + 30
      const intradayWindowOpen = isWeekday && currentTime >= marketOpen && currentTime <= marketClose
      const isSameDay = isWithinTodayIst(winningTradesData.as_of)
      return intradayWindowOpen && isSameDay
    } catch {
      return false
    }
  }, [winningTradesData])

  const chatInputElRef = useRef<HTMLInputElement | null>(null)
  const [chatKeyboardInset, setChatKeyboardInset] = useState(0)

  // Watchlist refs
  const watchlistDialogRef = useRef<HTMLDivElement>(null)
  const watchlistCloseRef = useRef<HTMLButtonElement>(null)
  const watchlistScrollElRef = useRef<HTMLDivElement>(null)
  const watchlistScrollTopRef = useRef<number>(0)
  const watchlistRestoreScrollRef = useRef<boolean>(false)
  const arisChatSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMobile) {
      setChatKeyboardInset(0)
      return
    }

    const vv = (window as any).visualViewport
    if (!vv || typeof vv.addEventListener !== 'function') return

    const recompute = () => {
      try {
        const viewportHeight = Number(vv.height)
        const offsetTop = Number(vv.offsetTop || 0)
        const innerHeight = Number(window.innerHeight || 0)
        if (!Number.isFinite(viewportHeight) || !Number.isFinite(innerHeight)) return
        const inset = Math.max(0, Math.round(innerHeight - (viewportHeight + offsetTop)))
        setChatKeyboardInset(inset)
      } catch { }
    }

    recompute()
    vv.addEventListener('resize', recompute)
    vv.addEventListener('scroll', recompute)
    try {
      window.addEventListener('orientationchange', recompute)
    } catch { }

    return () => {
      try {
        vv.removeEventListener('resize', recompute)
        vv.removeEventListener('scroll', recompute)
      } catch { }
      try {
        window.removeEventListener('orientationchange', recompute as any)
      } catch { }
    }
  }, [isMobile])

  const swipeCloseTopPicks = useSwipeToClose({
    enabled: isMobile && showPicks,
    onClose: () => {
      setShowPicks(false)
      setShowHeatMap(true)
    },
  })

  const swipeCloseWinners = useSwipeToClose({
    enabled: isMobile && showWinningTrades,
    onClose: () => setShowWinningTrades(false),
  })

  const swipeCloseMore = useSwipeToClose({
    enabled: isMobile && isMoreOpen,
    onClose: () => setIsMoreOpen(false),
  })

  // Global listeners: hide tooltip on scroll; ESC closes drawers/modals and tooltip; keyboard shortcuts
  useEffect(() => {
    const onScroll = () => setTip(null)
    const onKey = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'Escape') {
        setPrefsOpen(false); setShowPortfolio(false); setShowWatchlist(false); setShowAgents(false); setShowPicks(false); setAnalyze(null); setTip(null); setChartView(null); setShowScalpingMonitor(false); setIsAccountDropdownOpen(false);
        if (disclosureAccepted) setShowDisclosure(false)
      }
      // P = Toggle Picks drawer
      else if (e.key === 'p' || e.key === 'P') {
        if (picks.length > 0) setShowPicks(s => !s)
        else onFetchPicks()
      }
      // / = Focus Fyntrix chat
      else if (e.key === '/') {
        e.preventDefault()
        openChat()
      }
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      // Close account dropdown when clicking outside
      if (isAccountDropdownOpen && !target.closest('[data-account-dropdown]')) {
        setIsAccountDropdownOpen(false)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('scroll', onScroll as any)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClick)
    }
  }, [picks, disclosureAccepted])

  // Realtime WebSocket connection for streaming updates (top picks, market brief, flows, ticks)
  useEffect(() => {
    let reconnectTimer: any = null
    let lastParseErrorAt = 0

    const connect = () => {
      try {
        if (reconnectTimer) {
          try { clearTimeout(reconnectTimer) } catch { }
          reconnectTimer = null
        }
        const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined
        const inferredBackendBase = `${window.location.protocol}//${window.location.hostname}:8000`
        const p = window.location.port
        const isViteDevPort = p === '5173' || p === '5174' || p === '5175' || p === '3000'
        const base =
          envBase ||
          (!import.meta.env.PROD && p && !isViteDevPort && p !== '8000'
            ? inferredBackendBase
            : window.location.origin)

        const url = base.replace(/^http/, 'ws') + '/v1/ws/market'
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('[WS] Connected to', url)
          // Re-subscribe to any symbols requested by child components
          try {
            const symbols = Array.from(subscribedSymbolsRef.current)
            if (symbols.length) {
              ws.send(JSON.stringify({ action: 'subscribe', symbols }))
            }
          } catch (err) {
            reportError(err, { feature: 'ws', action: 'resubscribe', extra: { url } })
          }
        }

        ws.onmessage = (event) => {
          try {
            if (typeof event.data !== 'string') return
            const raw = event.data.trim()
            // Some WS stacks send keepalive frames (e.g., "ping") that are not JSON.
            // Ignore them to avoid console spam.
            if (!raw || (raw[0] !== '{' && raw[0] !== '[')) return

            const msg = JSON.parse(raw)
            const type = msg?.type

            if (type === 'top_picks_update') {
              const msgUniverse = String(msg.universe || msg.universe_name || '').toUpperCase()
              const msgMode = String(msg.mode || '').toLowerCase()
              const activeMode = String(primaryMode || '').toLowerCase()

              // Treat Delivery/Positional as Swing for backward compatibility
              const normalizedActiveMode =
                activeMode === 'delivery' || activeMode === 'positional'
                  ? 'swing'
                  : activeMode

              // Auto-apply scheduler picks when active mode & universe match
              if (msgUniverse === universe.toUpperCase() && msgMode === normalizedActiveMode) {
                const items = Array.isArray(msg.items) ? msg.items.slice(0, 5) : []
                setPicks(items as AIPick[])
                setPicksAsOf(msg.as_of || msg.generated_at || '')
                setPicksData(msg)
                try {
                  localStorage.setItem('arise_picks', JSON.stringify({
                    items,
                    as_of: msg.as_of || msg.generated_at || '',
                    universe,
                    primary_mode: primaryMode,
                    picksData: msg
                  }))
                } catch { }
              }
            } else if (type === 'market_summary_update') {
              // Live Market Brief updates
              if (!msg.region || msg.region === marketRegion) {
                if (msg.payload) {
                  setMarket(msg.payload)
                  const ts = msg.payload?.as_of || new Date().toISOString()
                  setAsOf(ts)
                  try {
                    localStorage.setItem('arise_market', JSON.stringify(msg.payload))
                    localStorage.setItem('arise_market_asof', ts)
                  } catch { }
                }
              }
            } else if (type === 'flows_update') {
              // Live flows updates (DII/FII, sector flows, etc.)
              if (msg.payload) setFlows(msg.payload)
            } else if (type === 'scalping_monitor_update') {
              const exits = Array.isArray(msg.exits) ? msg.exits : []
              if (typeof msg.active_positions === 'number' || exits.length) {
                setScalpingMonitorRefreshToken(t => t + 1)
              }
              if (exits.length) {
                setScalpingWsExits(prev => {
                  const existing = new Set(prev.map((e: any) => `${e.symbol}-${e.exit_time}`))
                  const uniqueNew = exits.filter((e: any) => !existing.has(`${e.symbol}-${e.exit_time}`))
                  return uniqueNew.length ? [...prev, ...uniqueNew] : prev
                })
              }
            } else if (type === 'portfolio_monitor_update') {
              if (!msg.scope || msg.scope === 'positions') {
                setPortfolioMonitor(msg)
              } else if (msg.scope === 'watchlist') {
                setWatchlistMonitor(msg)
              }
            } else if (type === 'tick') {
              // Live tick for a subscribed symbol
              const symbol = String(msg.symbol || '').toUpperCase()
              const data = msg.data || {}
              if (!symbol || typeof data.last_price !== 'number') return
              setLivePrices(prev => ({
                ...prev,
                [symbol]: {
                  last_price: data.last_price,
                  change_percent: typeof data.change_percent === 'number' ? data.change_percent : prev[symbol]?.change_percent,
                  volume: typeof data.volume === 'number' ? data.volume : prev[symbol]?.volume,
                  updated_at: data.timestamp || new Date().toISOString(),
                },
              }))
            }
          } catch (err) {
            const now = Date.now()
            // Throttle parse errors to avoid flooding console/overlay.
            if (now - lastParseErrorAt > 15000) {
              lastParseErrorAt = now
              reportError(err, { feature: 'ws', action: 'message_parse', extra: { url } })
            }
          }
        }

        ws.onclose = () => {
          if (reconnectTimer) {
            try { clearTimeout(reconnectTimer) } catch { }
            reconnectTimer = null
          }
          reconnectTimer = setTimeout(connect, 5000)
        }

        ws.onerror = () => {
          try { ws && ws.close() } catch { }
        }
      } catch (err) {
        reportError(err, { feature: 'ws', action: 'connect', extra: { url: '/v1/ws/market' } })
      }
    }

    connect()

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
      wsRef.current = null
    }
  }, [universe, primaryMode, marketRegion])

  const subscribeSymbols = React.useCallback((symbols: string[]) => {
    const upper = symbols.map(s => String(s || '').toUpperCase()).filter(Boolean)
    if (!upper.length) return

    const toSubscribe: string[] = []
    const counts = symbolRefCountsRef.current
    upper.forEach(sym => {
      const prev = counts[sym] || 0
      const next = prev + 1
      counts[sym] = next
      if (prev === 0) {
        subscribedSymbolsRef.current.add(sym)
        toSubscribe.push(sym)
      }
    })

    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || toSubscribe.length === 0) return
    try {
      ws.send(JSON.stringify({ action: 'subscribe', symbols: toSubscribe }))
    } catch (err) {
      reportError(err, { feature: 'ws', action: 'subscribe' })
    }
  }, [])

  const fetchWatchlistMonitor = React.useCallback(async () => {
    try {
      setLoadingWatchlist(true)
      const res = await getPortfolioMonitor({ scope: 'watchlist' })
      if (res && res.found && res.data) {
        setWatchlistMonitor(res.data)
      } else {
        setWatchlistMonitor(null)
      }
    } catch (e) {
      reportError(e, { feature: 'watchlist', action: 'load_monitor' })
      setWatchlistMonitor(null)
    } finally {
      setLoadingWatchlist(false)
    }
  }, [])

  const fetchWatchlistEntriesAll = React.useCallback(async () => {
    try {
      setLoadingWatchlistEntriesAll(true)
      // API call to fetch all watchlist entries would go here
      // For now, using monitor data
      if (watchlistMonitor) {
        setWatchlistEntriesAll(watchlistMonitor.entries || [])
      }
    } catch (err) {
      reportError(err, { feature: 'watchlist', action: 'load_entries' })
    } finally {
      setLoadingWatchlistEntriesAll(false)
    }
  }, [watchlistMonitor])

  const mutateWatchlistStatus = React.useCallback(async (id: string, status: string) => {
    try {
      setWatchlistMutatingId(id)
      // API call to mutate watchlist status would go here
      console.log(`Mutating watchlist ${id} to ${status}`)
    } catch (err) {
      reportError(err, { feature: 'watchlist', action: 'mutate_status' })
    } finally {
      setWatchlistMutatingId(null)
    }
  }, [])

  const setChartReturnTo = React.useCallback((returnTo: 'watchlist' | null) => {
    // This would be implemented to track where to return after chart
    console.log('Set chart return to:', returnTo)
  }, [])

  const closeWatchlist = React.useCallback(() => {
    setShowWatchlist(false)
  }, [])

  const swipeCloseWatchlist = React.useCallback(() => {
    if (isMobile) {
      closeWatchlist()
    }
  }, [isMobile, closeWatchlist])

  const unsubscribeSymbols = React.useCallback((symbols: string[]) => {
    const upper = symbols.map(s => String(s || '').toUpperCase()).filter(Boolean)
    if (!upper.length) return

    const toUnsub: string[] = []
    const counts = symbolRefCountsRef.current
    upper.forEach(sym => {
      const prev = counts[sym] || 0
      if (prev <= 1) {
        delete counts[sym]
        if (subscribedSymbolsRef.current.has(sym)) {
          subscribedSymbolsRef.current.delete(sym)
          toUnsub.push(sym)
        }
      } else {
        counts[sym] = prev - 1
      }
    })

    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || toUnsub.length === 0) return
    try {
      ws.send(JSON.stringify({ action: 'unsubscribe', symbols: toUnsub }))
    } catch (err) {
      reportError(err, { feature: 'ws', action: 'unsubscribe' })
    }
  }, [])

  const sessionId = useMemo(() => {
    try { return localStorage.getItem('arise_session') || (() => { const id = Math.random().toString(36).slice(2); localStorage.setItem('arise_session', id); return id })() } catch { return 'local' }
  }, [])

  const isIndiaMarketOpen = useMemo(() => {
    try {
      const now = new Date()
      const nowIst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
      const day = nowIst.getDay() // 0=Sun, 6=Sat
      const isWeekday = day >= 1 && day <= 5

      const hours = nowIst.getHours()
      const minutes = nowIst.getMinutes()
      const currentTime = hours * 60 + minutes // minutes since midnight
      const marketOpen = 9 * 60 + 15  // 9:15 AM
      const marketClose = 15 * 60 + 30 // 3:30 PM

      return isWeekday && currentTime >= marketOpen && currentTime <= marketClose
    } catch {
      return false
    }
  }, [market])

  const isPreviousSessionData = useMemo(() => {
    try {
      if (picksData && typeof picksData.previous_session === 'boolean') {
        return !!picksData.previous_session
      }
      if (!picksAsOf) return false
      const asOfDate = new Date(picksAsOf)
      if (Number.isNaN(asOfDate.getTime())) return false
      const now = new Date()
      const todayIst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
      const asOfIst = new Date(asOfDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
      return asOfIst.toDateString() !== todayIst.toDateString()
    } catch {
      return false
    }
  }, [picksData, picksAsOf])

  const onFetchPicks = React.useCallback(async (forceRefresh: boolean = false) => {
    // Instant UI response - show picks drawer and indicate loading state
    setShowPicks(true)
    setLoadingPicks(true)
    setPicksSystemMessage('')

    let cached: any = null
    let canUseCached = false
    let needsRefresh = forceRefresh

    // Load cached picks once
    try {
      cached = JSON.parse(localStorage.getItem('arise_picks') || 'null')
    } catch {
      cached = null
    }

    if (cached && cached.items) {
      const cachedItems: AIPick[] = Array.isArray(cached.items) ? cached.items : []
      const sameUniverse = cached.universe === universe
      const sameMode = cached.primary_mode === primaryMode
      const todayLocal = isWithinTodayIst(cached.as_of)
      const freshLocal = isIndiaMarketOpen ? todayLocal : isWithinLastTradingSession(cached.as_of)

      const allFallbackCached = cachedItems.length > 0 && cachedItems.every(isFallbackPick)

      // During market hours, never treat previous-session local cache as fresh.
      // Force a backend refresh so users don't get stuck on yesterday's picks.
      if (isIndiaMarketOpen && !todayLocal) {
        needsRefresh = true
      }

      // If mode changed vs cache, force refresh only when market is open
      if (!sameMode) {
        console.log(`Mode mismatch: cached=${cached.primary_mode}, current=${primaryMode}. Forcing refresh.`)
        if (isIndiaMarketOpen) {
          needsRefresh = true
        }
      }

      if (!freshLocal) {
        try {
          localStorage.removeItem('arise_picks')
        } catch { }
      }

      // Safe to show cached instantly only if universe+mode match, snapshot is recent, and we're not on a Scalping fallback snapshot
      canUseCached = sameUniverse && sameMode && freshLocal && !allFallbackCached

      // If cache is for the right mode/universe, check for staleness (only when market is open)
      if (canUseCached && cached.as_of) {
        try {
          const asOfTime = new Date(cached.as_of).getTime()
          if (!Number.isNaN(asOfTime)) {
            const ageMinutes = (Date.now() - asOfTime) / 60000
            const isScalping = primaryMode === 'Scalping'
            const staleThreshold = isScalping ? 10 : 60
            if (ageMinutes > staleThreshold && isIndiaMarketOpen) {
              console.log(`Cached picks are stale (${ageMinutes.toFixed(1)} min old). Triggering background refresh.`)
              needsRefresh = true
            }
          }
        } catch { }
      }
    }

    // Show cached picks immediately if they are safe for the current universe/mode
    if (canUseCached) {
      const cachedItems: AIPick[] = Array.isArray(cached.items) ? cached.items : []
      setPicks(cachedItems as AIPick[])
      setPicksAsOf(cached.as_of || '')
      setPicksData(cached.picksData)
    }

    try {
      // Backend will serve from its own cache unless we explicitly request refresh
      const effectiveRefresh = needsRefresh && isIndiaMarketOpen
      const r = await getAgentsPicks({
        limit: 10,
        universe,
        session_id: sessionId,
        refresh: effectiveRefresh,
        primary_mode: primaryMode,
      })

      const items: AIPick[] = Array.isArray(r?.items) ? (r.items as AIPick[]) : []
      const allFallbackFresh = items.length > 0 && items.every(isFallbackPick)

      if (items.length === 0) {
        // If backend explicitly reports a fresh empty-picks run (common for Scalping),
        // do not fall back to cached last-session picks. Show a clear message instead.
        try {
          const runStatus = String((r as any)?.run_status || '').toLowerCase()
          const degradedReason = String((r as any)?.degraded_reason || '').toLowerCase()
          if (runStatus === 'degraded' && degradedReason === 'empty_picks') {
            setPicks([])
            setPicksAsOf((r as any)?.as_of || '')
            setPicksData(r)
            setPicksSystemMessage(
              'No actionable ' +
              primaryMode +
              ' picks were found for ' +
              universe.toUpperCase() +
              ' in the latest run. This can happen during quiet market conditions. Try again in a few minutes or switch universe.',
            )
            try {
              localStorage.removeItem('arise_picks')
            } catch { }
            return
          }
        } catch { }

        // No fresh picks from backend. If we already have a cached snapshot for this
        // universe/mode, keep showing it and clearly label that it is from the last
        // trading session instead of leaving the panel empty.
        const allowCachedFromLastSession =
          primaryMode === 'Scalping' || primaryMode === 'Intraday'
        const hasCachedItems =
          allowCachedFromLastSession &&
          canUseCached &&
          cached &&
          Array.isArray(cached.items) &&
          cached.items.length > 0

        if (hasCachedItems) {
          setPicksSystemMessage(
            'Using last trading session Top Five Picks from the previous run because agents have not produced fresh ' +
            primaryMode +
            ' recommendations for ' +
            universe.toUpperCase() +
            ' yet.',
          )
          // Keep existing picks/picksAsOf from cache.
        } else {
          setPicks([])
          setPicksAsOf(r?.as_of || '')
          setPicksData(r)
          setPicksSystemMessage(
            'None of the picks got selected by agents for ' +
            primaryMode +
            ' in ' +
            universe.toUpperCase() +
            ' in the latest run. Try again during market hours or switch universe/mode for more ideas.',
          )
        }
        // Do not cache an empty response as a valid snapshot.
        return
      }

      if (allFallbackFresh) {
        // Treat deterministic/fallback picks from backend as "no actionable setups" for all modes
        setPicks([])
        setPicksAsOf(r?.as_of || '')
        setPicksData(r)
        setPicksSystemMessage(
          'None of the picks got selected by agents for ' +
          primaryMode +
          ' in ' +
          universe.toUpperCase() +
          ' in the latest run. Try again during market hours or switch universe/mode for more ideas.',
        )
        // Do NOT cache these fallback picks to avoid showing them as real recommendations later
        return
      }

      setPicks(items)
      setPicksAsOf(r?.as_of || '')
      setPicksData(r) // Store full response including mode_info
      try {
        localStorage.setItem(
          'arise_picks',
          JSON.stringify({ items, as_of: r?.as_of || '', universe, primary_mode: primaryMode, picksData: r }),
        )
      } catch { }
    } catch {
      // On error, try to use cache ONLY if mode matches
      try {
        const fallback = JSON.parse(localStorage.getItem('arise_picks') || 'null')
        if (fallback && fallback.items && fallback.primary_mode === primaryMode) {
          setPicks(fallback.items as AIPick[])
          setPicksAsOf(fallback.as_of || '')
          setPicksData(fallback.picksData)
        } else {
          setPicks([])
        }
      } catch {
        setPicks([])
      }
    } finally {
      setLoadingPicks(false)
    }
  }, [universe, sessionId, primaryMode, isIndiaMarketOpen])

  useEffect(() => {
    let cancelled = false

      ; (async () => {
        try {
          if (picks.length > 0 && picksData && picksData.universe === universe && picksData.primary_mode === primaryMode) {
            return
          }

          let cached: any = null
          try {
            cached = JSON.parse(localStorage.getItem('arise_picks') || 'null')
          } catch {
            cached = null
          }

          const cachedFreshForOpenMarket = (() => {
            try {
              if (!cached || !cached.as_of) return false
              return isIndiaMarketOpen ? isWithinTodayIst(cached.as_of) : isWithinLastTradingSession(cached.as_of)
            } catch {
              return false
            }
          })()

          if (
            cached &&
            cached.items &&
            cached.universe === universe &&
            cached.primary_mode === primaryMode &&
            cachedFreshForOpenMarket
          ) {
            if (!cancelled) {
              const cachedItems: AIPick[] = Array.isArray(cached.items) ? cached.items : []
              setPicks(cachedItems as AIPick[])
              setPicksAsOf(cached.as_of || '')
              setPicksData(cached.picksData)
            }
            return
          } else if (cached && cached.as_of && !cachedFreshForOpenMarket) {
            try {
              localStorage.removeItem('arise_picks')
            } catch { }
          }

          const shouldForceRefresh = (() => {
            try {
              if (!isIndiaMarketOpen) return false
              if (!cached || !cached.as_of) return true
              if (cached.universe !== universe) return true
              if (cached.primary_mode !== primaryMode) return true
              return !isWithinTodayIst(cached.as_of)
            } catch {
              return false
            }
          })()

          const r = await getAgentsPicks({
            limit: 10,
            universe,
            session_id: sessionId,
            refresh: shouldForceRefresh,
            primary_mode: primaryMode,
          })

          if (cancelled) return

          const items: AIPick[] = Array.isArray(r?.items) ? (r.items as AIPick[]) : []
          const allFallback = items.length > 0 && items.every(isFallbackPick)

          if (allFallback) {
            // Do not pre-populate UI with deterministic/fallback picks; leave
            // picks empty so the drawer can show a clear "none selected" message
            // on explicit fetch.
            return
          }

          setPicks(items)
          setPicksAsOf(r?.as_of || '')
          setPicksData(r)
          // Prefetch with real picks should not leave an old "none selected" or
          // other stale banner from a different mode/universe.
          setPicksSystemMessage('')
          try {
            localStorage.setItem(
              'arise_picks',
              JSON.stringify({ items, as_of: r?.as_of || '', universe, primary_mode: primaryMode, picksData: r }),
            )
          } catch { }
        } catch (e) {
          reportError(e, { feature: 'picks', action: 'prefetch_top_picks', extra: { universe, primaryMode } })
        }
      })()

    return () => {
      cancelled = true
    }
  }, [universe, primaryMode, sessionId, picks.length, picksData])

  const fetchPortfolioMonitor = React.useCallback(async () => {
    try {
      setLoadingPortfolio(true)
      const res = await getPortfolioMonitor({ scope: 'positions' })
      if (res && res.found && res.data) {
        setPortfolioMonitor(res.data)
      } else {
        setPortfolioMonitor(null)
      }
    } catch (e) {
      reportError(e, { feature: 'portfolio', action: 'load_monitor' })
      setPortfolioMonitor(null)
    } finally {
      setLoadingPortfolio(false)
    }
  }, [])

  // Auto-refresh picks when primary mode changes (if picks drawer is open)
  useEffect(() => {
    if (showPicks && picks.length > 0) {
      onFetchPicks(true) // Force refresh when mode changes
    }
  }, [primaryMode, showPicks, onFetchPicks])

  useEffect(() => {
    if (!Array.isArray(picks) || picks.length === 0) return

    ensureStrategyCacheLoaded()

    const top = picks.slice(0, 3)

      ; (async () => {
        const updatedKeys: string[] = []

        for (const row of top) {
          if (!row || !row.symbol) continue

          const cacheKey = buildStrategyCacheKey(row.symbol, primaryMode, risk, picksAsOf)

          if (strategyCacheRef.current[cacheKey]?.plan) {
            prefetchedStrategyKeysRef.current.add(cacheKey)
            continue
          }

          if (prefetchedStrategyKeysRef.current.has(cacheKey)) {
            continue
          }

          prefetchedStrategyKeysRef.current.add(cacheKey)

          const score = typeof row.score_blend === 'number' ? row.score_blend : 0
          const dir = classifyPickDirection(score, primaryMode)
          const derivedFromScore = dir?.label || (score >= 80 ? 'Strong Buy' : score >= 60 ? 'Buy' : 'Sell')
          const baseRecommendation =
            row.recommendation && ['Strong Buy', 'Buy', 'Sell', 'Strong Sell'].includes(row.recommendation)
              ? row.recommendation
              : derivedFromScore
          const displayRecommendation = formatRecommendationLabel(row, baseRecommendation, dir)

          try {
            const body = {
              symbol: row.symbol,
              session_id: sessionId,
              risk,
              modes,
              primary_mode: primaryMode,
              context: { scores: row.scores },
            }

            const r = await postStrategySuggest(body as any)

            const entry: TradeStrategyCacheEntry = {
              symbol: row.symbol,
              plan: r?.plan,
              explain: r?.explain || [],
              scores: row.scores,
              blendScore: row.score_blend,
              strategyRationale: row.strategy_rationale,
              recommendation: displayRecommendation,
              agents: Array.isArray(row.agents) ? row.agents : undefined,
            }

            strategyCacheRef.current[cacheKey] = entry
            updatedKeys.push(cacheKey)
          } catch (e) {
            reportError(e, { feature: 'strategy', action: 'prefetch_strategy', extra: { symbol: row.symbol, primaryMode } })
          }
        }

        if (updatedKeys.length) {
          persistStrategyCache()
        }
      })()
  }, [picks, primaryMode, risk, picksAsOf, sessionId, modes])

  // Clear any stale Top Picks system banner when switching mode or universe.
  useEffect(() => {
    setPicksSystemMessage('')
  }, [primaryMode, universe])

  // Generate insights when picks change (purely factual, no auto market outlook)
  useEffect(() => {
    if (picks.length > 0) {
      const newInsights: any[] = []

      // Opportunity insights for top scoring picks
      const topPicks = picks.filter(p => p.score_blend >= 70)
      if (topPicks.length > 0) {
        const insightId = `hc|${primaryMode}|${universe}|${picksAsOf || 'na'}`
        if (!dismissedInsightIds[insightId]) {
          newInsights.push({
            id: insightId,
            type: 'opportunity',
            title: `${topPicks.length} High-Confidence Pick${topPicks.length > 1 ? 's' : ''}`,
            message: `${topPicks.map(p => p.symbol).join(', ')} showing strong signals (70%+ score)`,
            actionable: true,
            metadata: { symbols: topPicks.map(p => p.symbol), avgScore: topPicks.reduce((a, p) => a + p.score_blend, 0) / topPicks.length }
          })
        }
      }

      setInsights(newInsights.slice(0, 3)) // Max 3 insights
    }
  }, [picks, primaryMode, universe, picksAsOf, dismissedInsightIds])

  useEffect(() => {
    try {
      localStorage.setItem('arise_dismissed_insights_v1', JSON.stringify(dismissedInsightIds))
    } catch {
      // Ignore persist errors
    }
  }, [dismissedInsightIds])

  useEffect(() => {
    if (showPortfolio) {
      fetchPortfolioMonitor()
    }
  }, [showPortfolio, fetchPortfolioMonitor])

  useEffect(() => {
    if (showWinningTrades) {
      fetchPortfolioMonitor()
    }
  }, [showWinningTrades, fetchPortfolioMonitor])

  useEffect(() => {
    if (!showWinningTrades) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowWinningTrades(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [showWinningTrades])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      if (winningTradesData) return
        ; (async () => {
          try {
            const data = await getWinningTrades({ lookback_days: 7, universe: universe.toLowerCase() })
            if (!cancelled) {
              setWinningTradesData(data)
              try {
                localStorage.setItem('arise_winning_trades', JSON.stringify(data))
              } catch { }
            }
          } catch (e) {
            reportError(e, { feature: 'winners', action: 'prefetch_winning_trades', extra: { universe } })
          }
        })()
    }, 10000)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [universe, winningTradesData])

  useEffect(() => {
    if (!winningTradesData) return
    const dates = winningTradesAvailableDates
    if (!dates || dates.length === 0) return

      ; (async () => {
        const missing = dates.filter(d => !strategyExitsByDate[d])
        if (missing.length === 0) return

        for (const d of missing) {
          try {
            const data = await getStrategyExits({ date: d, strategy_id: 'NEWS_EXIT' })
            setStrategyExitsByDate(prev => ({ ...prev, [d]: data }))
          } catch (e) {
            reportError(e, { feature: 'winners', action: 'load_strategy_exits', extra: { date: d, strategy_id: 'NEWS_EXIT' } })
          }
        }
      })()
  }, [winningTradesData, winningTradesAvailableDates, strategyExitsByDate])

  useEffect(() => {
    if (showWatchlist) {
      fetchWatchlistMonitor()
    }
  }, [showWatchlist, fetchWatchlistMonitor])

  // When Heat Map is visible, subscribe to its symbols for live ticks
  useEffect(() => {
    if (!showHeatMap || showPicks || picks.length === 0) return
    const symbols = Array.from(new Set(picks.map(p => p.symbol).filter(Boolean)))
    if (!symbols.length) return
    subscribeSymbols(symbols)
    return () => {
      unsubscribeSymbols(symbols)
    }
  }, [showHeatMap, showPicks, picks, subscribeSymbols, unsubscribeSymbols])

  // Proactive messages removed - using single ARIS chat interface only

  const onAnalyze = React.useCallback(async (row: any) => {
    ensureStrategyCacheLoaded()

    const score = typeof row.score_blend === 'number' ? row.score_blend : 0
    const dir = classifyPickDirection(score, primaryMode)
    const derivedFromScore = dir?.label || (score >= 80 ? 'Strong Buy' : score >= 60 ? 'Buy' : 'Sell')
    const baseRecommendation =
      row.recommendation && ['Strong Buy', 'Buy', 'Sell', 'Strong Sell'].includes(row.recommendation)
        ? row.recommendation
        : derivedFromScore
    const displayRecommendation = formatRecommendationLabel(row, baseRecommendation, dir)

    // Prefer agents embedded on the pick row if available to avoid extra round-trip
    let agents: any[] | undefined = Array.isArray(row.agents) ? row.agents : undefined

    const cacheKey = buildStrategyCacheKey(row.symbol, primaryMode, risk, picksAsOf)
    const cached = strategyCacheRef.current[cacheKey]

    if (cached && cached.plan) {
      // Use cached plan immediately for instant modal opening
      setAnalyze({
        symbol: row.symbol,
        plan: cached.plan,
        explain: cached.explain || [],
        scores: row.scores || cached.scores,
        blendScore: typeof row.score_blend === 'number' ? row.score_blend : cached.blendScore,
        strategyRationale: row.strategy_rationale || cached.strategyRationale,
        recommendation: cached.recommendation || displayRecommendation,
        agents: cached.agents || agents,
      })
      return
    }

    // Open modal immediately in loading state
    setAnalyze({
      symbol: row.symbol,
      plan: null,
      explain: [],
      scores: row.scores,
      blendScore: row.score_blend,
      strategyRationale: row.strategy_rationale,
      recommendation: displayRecommendation,
      agents,
    })

    try {
      const recommendation = displayRecommendation
      const body = {
        symbol: row.symbol,
        session_id: sessionId,
        risk,
        modes,
        primary_mode: primaryMode,
        context: { scores: row.scores },
      }
      const r = await postStrategySuggest(body as any)

      // If we don't yet have full multi-agent breakdown, fetch it softly (ignore errors)
      if (!agents) {
        try {
          const full = await postAnalyze({ symbol: row.symbol, timeframe: '1d' } as any)
          if (full && Array.isArray((full as any).agents)) {
            agents = (full as any).agents
          }
        } catch (e) {
          reportError(e, { feature: 'strategy', action: 'fetch_agents', extra: { symbol: row.symbol } })
        }
      }

      const entry: TradeStrategyCacheEntry = {
        symbol: row.symbol,
        plan: r?.plan,
        explain: r?.explain || [],
        scores: row.scores,
        blendScore: row.score_blend,
        strategyRationale: row.strategy_rationale,
        recommendation,
        agents,
      }

      strategyCacheRef.current[cacheKey] = entry
      persistStrategyCache()

      setAnalyze(entry)
    } catch (e) {
      reportError(e, { feature: 'strategy', action: 'analyze', extra: { symbol: row.symbol } })
      // Keep modal open but surface a simple error message
      setAnalyze(prev => {
        if (!prev || prev.symbol !== row.symbol) return prev
        return {
          ...prev,
          explain: prev.explain && prev.explain.length ? prev.explain : ['Failed to analyze'],
        }
      })
    }
  }, [sessionId, risk, modes, primaryMode, picksAsOf])

  const onAskFromPick = (row: any) => {
    const text = `Analyze ${row.symbol} and suggest a trading strategy. Agent blend score: ${row.score_blend}%.`
    setChat(c => [...c, { role: 'user', text }])
  }


  // Fetch market data when region changes
  useEffect(() => {
    let timer: any = null
    let cancelled = false

    const fetchMarketAndFlows = async () => {
      try {
        const [m, f] = await Promise.all([getMarketSummary(marketRegion), getFlows()])
        if (cancelled) return
        console.log('Market data:', m)
        console.log('Flows data:', f)
        setMarket(m)
        setFlows(f)
        const ts = m?.as_of || new Date().toISOString()
        setAsOf(ts)
        try {
          localStorage.setItem('arise_market', JSON.stringify(m))
          localStorage.setItem('arise_flows', JSON.stringify(f))
          localStorage.setItem('arise_market_asof', ts)
        } catch { }
      } catch (err) {
        reportError(err, { feature: 'market', action: 'fetch_market_flows', extra: { region: marketRegion } })
        try {
          const mRaw = localStorage.getItem('arise_market')
          const fRaw = localStorage.getItem('arise_flows')
          if (mRaw) {
            const parsedM = JSON.parse(mRaw)
            setMarket(parsedM && typeof parsedM === 'object' ? parsedM : { indices: [] })
          }
          if (fRaw) {
            setFlows(JSON.parse(fRaw))
          }
        } catch { }
      }
    }

    // Initial fetch
    fetchMarketAndFlows()

    // Keep market brief fresh (<= ~1 minute behind) while the app is open.
    timer = setInterval(fetchMarketAndFlows, 60_000)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMarketAndFlows()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [marketRegion])

  // Fetch sparklines based on region
  useEffect(() => {
    (async () => {
      try {
        let symbols = 'NIFTY,BANKNIFTY,GOLD,USDINR'
        if (marketRegion === 'Global') {
          symbols = 'S&P 500,NASDAQ,LSE (FTSE 100),Hang Seng'
        }
        const r = await getMiniSeries(symbols, 20, marketRegion)
        console.log('Sparkline data received:', r?.series)
        const series = r?.series || {}
        setSpark(series)
        try {
          localStorage.setItem('arise_spark', JSON.stringify(series))
        } catch { }
      } catch (err) {
        reportError(err, { feature: 'market', action: 'fetch_sparklines', extra: { region: marketRegion } })
        try {
          const raw = localStorage.getItem('arise_spark')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed === 'object') {
              setSpark(parsed)
              return
            }
          }
        } catch { }
        setSpark({})
      }
    })()
  }, [marketRegion])

  useEffect(() => {
    let timer: any

    const fetchNews = async () => {
      try {
        const r = await getNews({ category: 'general', limit: 20 })
        const items = Array.isArray(r?.items) ? r.items : []
        // Separate events (corporate actions, earnings, announcements) from general news
        const evts = items.filter((n: any) => {
          const title = String(n.title || '').toLowerCase()
          const desc = String(n.description || '').toLowerCase()
          return title.includes('announcement') || title.includes('filing') ||
            title.includes('corporate action') || title.includes('agm') ||
            desc.includes('corporate filing') || desc.includes('event calendar')
        })
        const newsItems = cleanNewsList(items)
        setEvents(evts.length > 0 ? evts : items.slice(0, 3)) // Fallback to first 3 items if no events
        setEventsAsOf(r?.as_of || '')
        setNews(newsItems)
        setNewsAsOf(r?.as_of || '')
        try {
          localStorage.setItem('arise_news', JSON.stringify({
            items: newsItems,
            as_of: r?.as_of || '',
          }))
        } catch { }
      } catch (e) {
        reportError(e, { feature: 'news', action: 'fetch_news', extra: { category: 'general' } })
        // On failure, fall back to cached news if available
        try {
          const raw = localStorage.getItem('arise_news')
          if (raw) {
            const parsed = JSON.parse(raw)
            const items = Array.isArray(parsed?.items) ? parsed.items : (Array.isArray(parsed) ? parsed : [])
            const evts = items.filter((n: any) => {
              const title = String(n.title || '').toLowerCase()
              const desc = String(n.description || '').toLowerCase()
              return title.includes('announcement') || title.includes('filing') ||
                title.includes('corporate action') || title.includes('agm') ||
                desc.includes('corporate filing') || desc.includes('event calendar')
            })
            const newsItems = cleanNewsList(items)
            setEvents(evts.length > 0 ? evts : items.slice(0, 3))
            setEventsAsOf(parsed?.as_of || '')
            setNews(newsItems)
            setNewsAsOf(parsed?.as_of || '')
            return
          }
        } catch {
          // Ignore parse errors and clear to empty below
        }
        setNews([])
        setEvents([])
      }
    }

    fetchNews()
    timer = setInterval(fetchNews, 5 * 60 * 1000)

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [])

  const tiles = useMemo(() => {
    const t: Array<{ name: string, val: string, pct?: number, accent: string }> = []
    try {
      const indices = market?.indices || []

      if (marketRegion === 'India') {
        const nf = indices.find((x: any) => (x.name || '').toLowerCase().includes('nifty 50') || (x.name || '').toLowerCase() === 'nifty')
        const bn = indices.find((x: any) => (x.name || '').toLowerCase().includes('bank'))
        const gold = indices.find((x: any) => (x.name || '').toLowerCase().includes('gold'))

        if (nf) t.push({ name: 'NIFTY', val: String(Number(nf.price || 0).toFixed(2)), pct: Number(nf.chg_pct || 0), accent: '#1d4ed8' })
        if (bn) t.push({ name: 'BANKNIFTY', val: String(Number(bn.price || 0).toFixed(2)), pct: Number(bn.chg_pct || 0), accent: '#7c3aed' })

        // Try to get GOLD from indices first, then from spark
        if (gold && gold.price) {
          t.push({ name: 'GOLD', val: String(Number(gold.price).toFixed(2)), pct: Number(gold.chg_pct || 0), accent: '#f59e0b' })
        } else {
          const goldSpark = spark['GOLD'] || []
          if (goldSpark.length) {
            const last = goldSpark[goldSpark.length - 1], prev = goldSpark[goldSpark.length - 2] || last
            const pct = prev ? ((last - prev) / prev * 100) : 0
            t.push({ name: 'GOLD', val: String(last.toFixed(2)), pct: Number(pct.toFixed(2)), accent: '#f59e0b' })
          } else if (gold) {
            // Show Gold card even if price is null
            t.push({ name: 'GOLD', val: 'N/A', pct: undefined, accent: '#f59e0b' })
          }
        }

        // USDINR from indices first (if available), then from spark
        const fxIndex = indices.find((x: any) => {
          const nm = (x.name || '').toUpperCase()
          return nm.includes('USD/INR') || nm.includes('USDINR')
        })
        if (fxIndex && fxIndex.price != null) {
          t.push({
            name: 'USD/INR',
            val: String(Number(fxIndex.price || 0).toFixed(2)),
            pct: Number(fxIndex.chg_pct || 0),
            accent: '#10b981'
          })
        } else {
          const fx = spark['USDINR'] || []
          if (fx.length) {
            const last = fx[fx.length - 1], prev = fx[fx.length - 2] || last
            const pct = prev ? ((last - prev) / prev * 100) : 0
            t.push({ name: 'USD/INR', val: String(last.toFixed(2)), pct: Number(pct.toFixed(2)), accent: '#10b981' })
          } else if (fxIndex) {
            t.push({ name: 'USD/INR', val: 'N/A', pct: undefined, accent: '#10b981' })
          }
        }
      } else {
        // Global markets
        indices.forEach((idx: any) => {
          const name = idx.name || ''
          let displayName = name
          let accent = '#1d4ed8'

          if (name.toLowerCase().includes('s&p')) { displayName = 'S&P 500'; accent = '#1d4ed8' }
          else if (name.toLowerCase().includes('nasdaq')) { displayName = 'NASDAQ'; accent = '#7c3aed' }
          else if (name.toLowerCase().includes('ftse')) { displayName = 'FTSE 100'; accent = '#f59e0b' }
          else if (name.toLowerCase().includes('hang seng')) { displayName = 'Hang Seng'; accent = '#10b981' }

          t.push({
            name: displayName,
            val: String(Number(idx.price || 0).toFixed(2)),
            pct: Number(idx.chg_pct || 0),
            accent
          })
        })
      }
    } catch { }
    return t
  }, [market, spark, marketRegion])

  const sentiment = useMemo(() => {
    try {
      // Sentiment based only on Nifty 50 performance
      const niftyPct = Number((tiles.find(x => x.name === 'NIFTY')?.pct) ?? 0)

      if (niftyPct > 0.40) return { label: 'Bullish', color: '#16a34a', score: niftyPct }
      if (niftyPct >= 0.20) return { label: 'Trending Upward', color: '#22c55e', score: niftyPct }
      if (niftyPct > -0.20) return { label: 'Range Bound', color: '#64748b', score: niftyPct }
      if (niftyPct >= -0.40) return { label: 'Trending Downward', color: '#f97316', score: niftyPct }
      return { label: 'Bearish', color: '#ef4444', score: niftyPct }
    } catch { return { label: 'Range Bound', color: '#64748b', score: 0 } }
  }, [tiles])

  const { buyPicks, sellPicks } = useMemo(() => {
    const result = { buyPicks: [] as AIPick[], sellPicks: [] as AIPick[] }
    if (!Array.isArray(picks) || picks.length === 0) return result

    const enriched = picks
      .filter((p: any) => {
        const rec = typeof p.recommendation === 'string' ? p.recommendation.toLowerCase() : ''
        return rec !== 'watch' && rec !== 'hold'
      })
      .map(p => {
        const score = typeof p.score_blend === 'number' ? p.score_blend : 50
        const scoreNorm = (score - 50) / 50

        const byScore = classifyPickDirection(p.score_blend, primaryMode)
        if (byScore) {
          return { pick: p, dir: byScore }
        }

        const rec = typeof p.recommendation === 'string' ? p.recommendation.toLowerCase() : ''
        const modeLower = (primaryMode || '').toLowerCase()
        const longOnly = modeLower === 'swing' || modeLower === 'options'

        if (rec.includes('buy')) {
          const strong = rec.includes('strong')
          return {
            pick: p,
            dir: {
              side: 'long',
              strength: strong ? 'strong' : 'normal',
              label: strong ? 'Strong Buy' : 'Buy',
              scoreNorm,
            },
          }
        }

        if (!longOnly && rec.includes('sell')) {
          const strong = rec.includes('strong')
          return {
            pick: p,
            dir: {
              side: 'short',
              strength: strong ? 'strong' : 'normal',
              label: strong ? 'Strong Sell' : 'Sell',
              scoreNorm,
            },
          }
        }

        return { pick: p, dir: null }
      })
      .filter(x => x.dir !== null) as { pick: AIPick; dir: PickDirection }[]

    if (!enriched.length) return result

    const longSide = enriched
      .filter(x => x.dir.side === 'long')
      .sort((a, b) => (b.pick.score_blend || 0) - (a.pick.score_blend || 0))
      .slice(0, 5)
      .map(x => x.pick)

    const shortSide = enriched
      .filter(x => x.dir.side === 'short')
      .sort((a, b) => (a.pick.score_blend || 0) - (b.pick.score_blend || 0))
      .slice(0, 5)
      .map(x => x.pick)

    return { buyPicks: longSide, sellPicks: shortSide }
  }, [picks, primaryMode])

  const heatMapStocks = useMemo(() => {
    const rows: Array<{ symbol: string; score: number; change?: number; price?: number; live?: boolean }> = []
    const source: AIPick[] = [...buyPicks, ...sellPicks]

    if (!Array.isArray(source) || source.length === 0) {
      return rows
    }

    for (const p of source) {
      if (!p || !p.symbol) continue

      const symbol: string = String(p.symbol || '').toUpperCase()
      const score: number = typeof p.score_blend === 'number' ? p.score_blend : 0

      const live = livePrices[symbol]
      let change: number | undefined
      let price: number | undefined
      let isLive: boolean | undefined

      try {
        if (live && typeof live.updated_at === 'string') {
          const ts = new Date(live.updated_at).getTime()
          if (!Number.isNaN(ts)) {
            // consider tick live if updated within last 20 seconds
            isLive = (Date.now() - ts) <= 20000
          }
        }
      } catch {
        isLive = undefined
      }

      if (live && typeof live.change_percent === 'number') {
        change = live.change_percent
      } else if (typeof (p as any).intraday_change_pct === 'number') {
        // Backend-enriched intraday % move vs previous close
        change = (p as any).intraday_change_pct
      } else if (
        typeof (p as any).last_price === 'number' &&
        typeof (p as any).prev_close === 'number' &&
        (p as any).prev_close
      ) {
        const last = (p as any).last_price
        const prev = (p as any).prev_close
        change = ((last - prev) / prev) * 100
      }

      if (live && typeof live.last_price === 'number') {
        price = live.last_price
      } else if (typeof (p as any).current_price === 'number') {
        price = (p as any).current_price
      } else if (typeof (p as any).last_price === 'number') {
        price = (p as any).last_price
      }

      rows.push({ symbol, score, change, price, live: isLive })
    }

    return rows
  }, [buyPicks, sellPicks, livePrices])

  const modeThresholds = useMemo(() => {
    const mode = (primaryMode || '').toLowerCase()
    let strongBuyMin = 50 + 0.4 * 50
    let buyMin = 50 + 0.2 * 50
    let sellMax: number | null = 50 + -0.1 * 50
    let strongSellMax: number | null = 50 + -0.3 * 50
    let hasShorts = true

    if (mode === 'scalping') {
      strongBuyMin = 50 + 0.4 * 50
      buyMin = 50 + 0.2 * 50
      strongSellMax = 50 + -0.3 * 50
      sellMax = 50 + -0.1 * 50
    } else if (mode === 'intraday' || mode === 'futures' || mode === 'options') {
      strongBuyMin = 50 + 0.4 * 50
      buyMin = 50 + 0.2 * 50
      strongSellMax = 50 + -0.3 * 50
      sellMax = 50 + -0.1 * 50
    } else if (mode === 'swing') {
      strongBuyMin = 50 + 0.4 * 50
      buyMin = 50 + 0.2 * 50
      strongSellMax = null
      sellMax = null
      hasShorts = false
    } else {
      strongBuyMin = 50 + 0.4 * 50
      buyMin = 50 + 0.2 * 50
      strongSellMax = 50 + -0.3 * 50
      sellMax = 50 + -0.1 * 50
    }

    const strongBuyLabel = Math.round(strongBuyMin)
    const buyLabel = Math.round(buyMin)
    const sellLabel = sellMax != null ? Math.round(sellMax) : null
    const strongSellLabel = strongSellMax != null ? Math.round(strongSellMax) : null

    return { strongBuyLabel, buyLabel, sellLabel, strongSellLabel, hasShorts }
  }, [primaryMode])

  const savePrefs = async () => {
    try {
      localStorage.setItem('arise_risk', risk)
      localStorage.setItem('arise_modes', JSON.stringify(modes))
      localStorage.setItem('arise_primary_mode', primaryMode)
      localStorage.setItem('arise_auxiliary_modes', JSON.stringify(auxiliaryModes))
    } catch { }
    try {
      const session = localStorage.getItem('arise_session') || 'local'
      await fetch('/v1/memory/upsert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: session, data: { risk, modes, primary_mode: primaryMode, auxiliary_modes: auxiliaryModes } }) })
    } catch { }
    setPrefsOpen(false)
    // Refresh picks if drawer is open to reflect new trading mode
    if (showPicks && picks.length > 0) {
      onFetchPicks(true)
    }
  }

  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState<Array<{ role: 'user' | 'assistant', text: string }>>([])
  const [chatLayout, setChatLayout] = useState<ChatLayout>('bottom-docked')
  const [chatLoading, setChatLoading] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const chatMessagesRef = useRef<HTMLDivElement | null>(null)
  const onSend = React.useCallback(async () => {
    const t = chatInput.trim()
    if (!t) return
    setChat(c => [...c, { role: 'user', text: t }])
    setChatInput('')

    try {
      setChatLoading(true)
      // Build context with agent data
      const context: any = {}

      // If we have picks loaded, include them for context
      if (picks.length > 0) {
        context.top_picks = picks.slice(0, 5).map(p => ({
          symbol: p.symbol,
          score: p.score_blend,
          recommendation: p.recommendation,
          key_findings: p.key_findings,
          strategy_rationale: p.strategy_rationale,
          agents: p.agents
        }))
      }

      // Include market sentiment
      if (market.indices && market.indices.length > 0) {
        const nifty = market.indices.find((i: any) => i.name?.includes('NIFTY'))
        if (nifty) {
          context.market_sentiment = {
            index: 'NIFTY 50',
            price: nifty.price,
            change_pct: nifty.pct,
            sentiment: sentiment.label
          }
        }
      }

      // Include user preferences
      context.user_preferences = {
        risk_profile: risk,
        primary_mode: primaryMode,
        universe: universe
      }

      const r = await postChat({ session_id: sessionId, conversation_id: sessionId, message: t, context })
      // Backend returns {response: string, suggestions: [], ...}
      const responseText = r?.response || 'Sorry, I could not process that.'
      setChat(c => [...c, { role: 'assistant', text: responseText }])
    } catch (e) {
      reportError(e, { feature: 'chat', action: 'send' })
      setChat(c => [...c, { role: 'assistant', text: 'Sorry, I am having trouble connecting. Please check if OpenAI API key is configured.' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, sessionId, picks, market, sentiment, risk, primaryMode, universe])

  const toggleMobileChat = React.useCallback(() => {
    setShowMobileChat(!showMobileChat)
  }, [showMobileChat])

  useEffect(() => {
    const el = chatMessagesRef.current
    if (!el || chat.length === 0) return
    el.scrollTop = el.scrollHeight
  }, [chat.length])

  return (
    <div className="app-shell" style={{ display: 'flex', height: '100dvh', background: '#f9fafb', overflow: 'hidden' }}>
      {/* Continuous Left Sidebar - dark unified band */}
      {!isMobile && (
        <aside style={{
          width: 116,
          background: '#f5faff',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100dvh',
          left: 0,
          top: 0,
          zIndex: 100
        }}>
          {/* Branding */}
          <div style={{ height: 44 }} />

          {/* Navigation */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 6px', flex: 1 }}>
            <button
              title="Home"
              onClick={handleHomeClick}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 999,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.14)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <LayoutGrid size={18} color="#0f172a" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Home</span>
            </button>

            <button
              title="Preferences"
              onClick={() => setPrefsOpen(true)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 999,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.14)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <SlidersHorizontal size={18} color="#0f172a" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Preferences</span>
            </button>

            <button
              title="Portfolio"
              onClick={() => {
                setShowPortfolio(true)
                setShowWatchlist(false)
                setShowPicks(false)
                setShowHeatMap(false)
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 999,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.14)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <BriefcaseBusiness size={18} color="#0f172a" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Portfolio</span>
            </button>
            <button
              title="Watchlist"
              onClick={() => {
                setShowWatchlist(true)
                setShowPortfolio(false)
                setShowPicks(false)
                setShowHeatMap(false)
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 999,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.14)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <Image size={18} color="#0f172a" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Watchlist</span>
            </button>
            <button
              title="Scalping Monitor"
              onClick={() => setShowScalpingMonitor(true)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 999,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.14)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <SquareActivity size={18} color="#0f172a" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Scalp</span>
            </button>
            <button
              title="Winning Trades"
              onClick={async () => {
                setShowWinningTrades(true)
                try {
                  setLoadingWinningTrades(true)
                  const data = await getWinningTrades({ lookback_days: 7, universe: universe.toLowerCase() })
                  setWinningTradesData(data)
                  try {
                    localStorage.setItem('arise_winning_trades', JSON.stringify(data))
                  } catch { }
                } catch (e) {
                  reportError(e, { feature: 'winners', action: 'load_winning_trades', extra: { universe } })
                } finally {
                  setLoadingWinningTrades(false)
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 999,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.14)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <Trophy size={18} color="#0f172a" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Winners</span>
            </button>
            {/* <button
              title="RL Metrics"
              onClick={async () => {
                setShowRlMetrics(true)
                setRlMetricsError(null)
                try {
                  setLoadingRlMetrics(true)
                  const [daily, policy] = await Promise.all([
                    getRlMetrics({ view: 'daily' }),
                    getRlMetrics({ view: 'policy' }),
                  ])
                  setRlDailyData(Array.isArray(daily?.daily) ? daily.daily : null)
                  setRlMetricsData(policy)
                } catch (e) {
                  reportError(e, { feature: 'rl', action: 'load_metrics' })
                  setRlMetricsError('Failed to load RL metrics')
                } finally {
                  setLoadingRlMetrics(false)
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 999,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.14)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <Brain size={18} color="#0f172a" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>RL</span>
            </button> */}
          </nav>

          {/* Primary Mode Display at Bottom */}
          <div style={{ padding: '16px', borderTop: '1px solid rgba(30,64,175,0.7)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>TRADING MODE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {availableModes.filter(m => m.value !== 'Commodity').map((mode) => {
                const isActive = primaryMode === mode.value
                // Extract text without emoji for display
                const displayText = mode.value
                return (
                  <button
                    key={mode.value}
                    onClick={() => {
                      setPrimaryMode(mode.value)
                      setAuxiliaryModes(aux => aux.filter(m => m !== mode.value))
                      try { localStorage.setItem('arise_primary_mode', mode.value) } catch { }
                      // Refresh picks if drawer is open
                      if (showPicks) onFetchPicks(true)
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTip({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                        text: mode.description,
                        type: 'mode'
                      })
                      e.currentTarget.style.background = 'rgba(37,99,235,0.95)'
                      e.currentTarget.style.border = '1px solid rgba(148,163,184,0.9)'
                    }}
                    onMouseLeave={e => {
                      setTip(null)
                      e.currentTarget.style.background = isActive ? 'rgba(37,99,235,0.95)' : 'rgba(15,23,42,0.9)'
                      e.currentTarget.style.border = isActive
                        ? '1px solid rgba(148,163,184,0.9)'
                        : '1px solid rgba(30,41,59,0.9)'
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: 9,
                      fontWeight: 600,
                      borderRadius: 999,
                      border: isActive ? '1px solid rgba(148,163,184,0.9)' : '1px solid rgba(30,41,59,0.9)',
                      background: isActive ? 'rgba(37,99,235,0.95)' : 'rgba(15,23,42,0.9)',
                      color: '#e5e7eb',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      letterSpacing: 0.3
                    }}
                  >
                    {displayText} {isActive ? '\u2713' : ''}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      )}

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          top: 0,
          height: 44,
          background: '#f5faff',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 24px',
          boxShadow: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: isMobile ? 12 : 128, maxWidth: '100%' }}>
          <FyntrixLogo fontSize={22} fontWeight={900} isMobile={isMobile} />
          <div
            style={{
              fontSize: 12,
              color: '#334155',
              fontWeight: 500,
              fontStyle: 'italic',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setShowAgents(true)}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#0f172a'
              e.currentTarget.style.textDecoration = 'underline'
              e.currentTarget.style.textDecorationStyle = 'dotted'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#334155'
              e.currentTarget.style.textDecoration = 'none'
            }}
          >
            (trading assisted by AI agents)
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div className={isMobile ? 'hide-on-mobile' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 16, transform: isMobile ? 'none' : 'translateX(-140px)' }}>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0f172a',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  letterSpacing: 0.25
                }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
                onClick={() => setShowCompany(true)}
              >
                Company
              </button>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0f172a',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  letterSpacing: 0.25
                }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
                onClick={() => setShowProducts(true)}
              >
                Products
              </button>
              <button
                title="Disclosure & Disclaimer"
                onClick={() => setShowDisclosure(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(148,163,184,0.85)',
                  cursor: 'pointer',
                  color: '#e5e7eb',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 0.4
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,64,175,0.95)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.95)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <Copy size={16} color="#e5e7eb" />
                <span style={{ textTransform: 'uppercase' }}>Disclosure</span>
              </button>
            </div>
          </div>
          {isMobile ? (
            <>
              <AccountDropdown
                isAccountDropdownOpen={isAccountDropdownOpen}
                setIsAccountDropdownOpen={setIsAccountDropdownOpen}
                setIsAccountOpen={setIsAccountOpen}
                setIsLogoutConfirmOpen={setIsLogoutConfirmOpen}
                accountProfile={accountProfile}
              />

              {/* <button
                title="More"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(148,163,184,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease'
                }}
                onClick={() => setIsMoreOpen(true)}
              >
                <Menu size={18} color="#e5e7eb" />
              </button> */}
            </>
          ) : (
            <>
              <button
                title="Notifications"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(148,163,184,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,64,175,0.95)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.95)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <Bell size={16} color="#e5e7eb" />
              </button>
              <button
                title="Chat"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(148,163,184,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease'
                }}
                onClick={() => setIsSupportChatOpen(true)}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,64,175,0.95)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.95)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <MessageCircle size={16} color="#e5e7eb" />
              </button>
              <button
                title="What's New"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(148,163,184,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,64,175,0.95)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.95)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <Megaphone size={16} color="#e5e7eb" />
              </button>
              <AccountDropdown
                isAccountDropdownOpen={isAccountDropdownOpen}
                setIsAccountDropdownOpen={setIsAccountDropdownOpen}
                setIsAccountOpen={setIsAccountOpen}
                setIsLogoutConfirmOpen={setIsLogoutConfirmOpen}
                accountProfile={accountProfile}
              />
            </>
          )}
        </div>
      </div>

      {isMobile && isMoreOpen && (
        <div
          onClick={() => setIsMoreOpen(false)}
          role="dialog"
          aria-modal={true}
          aria-label="More"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 2500,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 12,
            boxSizing: 'border-box',
            overscrollBehavior: 'contain',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            ref={moreDialogRef}
            tabIndex={-1}
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#fff',
              borderRadius: 18,
              overflow: 'hidden',
              border: '1px solid rgba(226,232,240,0.9)',
              boxShadow: '0 18px 60px rgba(2,6,23,0.22)',
            }}
          >
            <div
              {...swipeCloseMore}
              style={{
                padding: '12px 14px',
                paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
                background: '#f8fafc',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 14 }}>More</div>
              <button
                ref={moreCloseRef}
                onClick={() => setIsMoreOpen(false)}
                style={{
                  border: 'none',
                  background: '#fff',
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: 18,
                  color: '#0f172a',
                  borderTop: '1px solid rgba(226,232,240,0.9)',
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr', gap: 8, overflowY: 'auto', maxHeight: '70dvh', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              {[
                // {
                //   title: 'Preferences',
                //   onClick: () => {
                //     setIsMoreOpen(false)
                //     setPrefsOpen(true)
                //   },
                // },
                // {
                //   title: 'Portfolio',
                //   onClick: () => {
                //     setIsMoreOpen(false)
                //     setShowPortfolio(true)
                //     setShowWatchlist(false)
                //     setShowPicks(false)
                //     setShowHeatMap(false)
                //   },
                // },
                {
                  title: 'Scalping Monitor',
                  onClick: () => {
                    setIsMoreOpen(false)
                    setShowScalpingMonitor(true)
                  },
                },
                // {
                //   title: 'RL Metrics',
                //   onClick: async () => {
                //     setIsMoreOpen(false)
                //     await openRl()
                //   },
                // },
                // {
                //   title: 'Disclosure',
                //   onClick: () => {
                //     setIsMoreOpen(false)
                //     setShowDisclosure(true)
                //   },
                // },
                // {
                //   title: 'Account',
                //   onClick: () => {
                //     setIsMoreOpen(false)
                //     setIsAccountOpen(true)
                //   },
                // },
                {
                  title: 'Support',
                  onClick: () => {
                    setIsMoreOpen(false)
                    setIsSupportChatOpen(true)
                  },
                },
                {
                  title: 'Company',
                  onClick: () => {
                    setIsMoreOpen(false)
                    setShowCompany(true)
                  },
                },
                {
                  title: 'Products',
                  onClick: () => {
                    setIsMoreOpen(false)
                    setShowProducts(true)
                  },
                },
              ].map((item) => (
                <button
                  key={item.title}
                  onClick={item.onClick}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 14px',
                    borderRadius: 14,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: 800,
                    color: '#0f172a',
                    minHeight: 44,
                  }}
                >
                  {item.title}
                </button>
              ))}
            </div>
            <div className="safe-area-bottom" />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{
        marginLeft: isMobile ? 0 : 116,
        flex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 12 : 20,
        padding: isMobile
          ? `44px 12px calc(${LAYOUT_TOKENS.bottomNavHeight}px + env(safe-area-inset-bottom) + 12px) 12px`
          : '44px 32px 20px 32px',
        maxWidth: isMobile ? '100vw' : 'calc(100vw - 116px)',
        height: '100dvh',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>

        <div style={{ flex: 1, width: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'hidden', paddingRight: 4 }}>
          {/* ARIS Chat - Single, Intelligent, Stable Interface */}
          <AIResearchChat
            chatInput={chatInput}
            setChatInput={setChatInput}
            chat={chat}
            setChat={setChat}
            chatLayout={chatLayout}
            setChatLayout={setChatLayout}
            chatLoading={chatLoading}
            setChatLoading={setChatLoading}
            onSend={onSend}
            isMobile={isMobile}
            chatKeyboardInset={chatKeyboardInset}
            picks={picks}
            market={market}
            sentiment={sentiment}
            risk={risk}
            primaryMode={primaryMode}
            universe={universe}
            sessionId={sessionId}
            onToggleChat={toggleMobileChat}
            showChat={showMobileChat}
          />

          <div style={{ order: 1, flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: isMobile ? 'contain' : undefined }}>

            {!showPicks && (showPortfolio || showWatchlist) && (
              <section style={{ padding: 0, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', marginBottom: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.2 }}>{showPortfolio ? 'Portfolio' : 'Watchlist'}</div>
                    <div style={{ fontSize: 11, opacity: 0.9 }}>
                      {showPortfolio ? 'Live snapshot of your Zerodha positions and holdings.' : 'Symbols you have marked via Set Alert.'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowPortfolio(false)
                      setShowWatchlist(false)
                      setShowHeatMap(true)
                    }}
                    style={{ border: '1px solid rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.18)', color: '#ffffff', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 20, lineHeight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}
                    aria-label={showPortfolio ? 'Close Portfolio' : 'Close Watchlist'}
                    title="Close"
                  >
                    ×
                  </button>
                </div>

                <div style={{ padding: 12 }}>
                  {showPortfolio && (
                    (() => {
                      if (loadingPortfolio) {
                        return <div style={{ fontSize: 12, color: '#64748b', padding: 8 }}>Loading portfolio snapshot…</div>
                      }

                      const data = portfolioMonitor
                      if (!data || !Array.isArray(data.positions) || data.positions.length === 0) {
                        return (
                          <div style={{ fontSize: 12, color: '#64748b', padding: 8 }}>
                            No open positions or holdings detected.
                            <br />
                            Ensure Zerodha is connected and market is open.
                          </div>
                        )
                      }

                      const summary = data.summary || {}

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: 8, background: '#f9fafb' }}>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                              Snapshot as of {data.as_of ? formatIstTime(data.as_of) : '–'}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11 }}>
                              <div style={{ flex: '1 1 45%' }}>
                                <div style={{ color: '#4b5563' }}>Positions</div>
                                <div style={{ fontWeight: 600 }}>{summary.positions ?? data.positions.length}</div>
                              </div>
                              <div style={{ flex: '1 1 45%' }}>
                                <div style={{ color: '#4b5563' }}>Net Exposure</div>
                                <div style={{ fontWeight: 600 }}>₹{Number(summary.net_exposure || 0).toLocaleString('en-IN')}</div>
                              </div>
                              <div style={{ flex: '1 1 45%' }}>
                                <div style={{ color: '#4b5563' }}>Gross Exposure</div>
                                <div style={{ fontWeight: 600 }}>₹{Number(summary.gross_exposure || 0).toLocaleString('en-IN')}</div>
                              </div>
                              <div style={{ flex: '1 1 45%' }}>
                                <div style={{ color: '#4b5563' }}>Avg Health</div>
                                <div style={{ fontWeight: 600 }}>{summary.avg_health_score ?? 100}</div>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Positions</div>
                            {data.positions.map((p: any, idx: number) => {
                              const urgency = String(p.urgency || 'LOW').toUpperCase()
                              let urgencyColor = '#10b981'
                              if (urgency === 'CRITICAL') urgencyColor = '#ef4444'
                              else if (urgency === 'HIGH') urgencyColor = '#f97316'
                              else if (urgency === 'MEDIUM') urgencyColor = '#eab308'
                              const ret = typeof p.return_pct === 'number' ? p.return_pct : 0
                              const retColor = ret > 0 ? '#16a34a' : ret < 0 ? '#dc2626' : '#6b7280'

                              const alerts: any[] = Array.isArray(p.alerts) ? p.alerts : []
                              const newsAlert = alerts.find(a => a && a.type === 'NEWS_STRATEGY_ADVISORY')
                              let newsRiskLabel: string | null = null
                              let newsRiskScore: number | null = null
                              let newsRiskColor = '#6b7280'
                              let newsRiskSummary: string | null = null
                              if (newsAlert) {
                                const level = computeSentimentRiskLevel((newsAlert as any).news_risk_score)
                                if (level) {
                                  newsRiskScore = level.score
                                  newsRiskLabel = level.label
                                  newsRiskColor = level.color
                                }
                                if (typeof newsAlert.news_reason === 'string' && newsAlert.news_reason.trim()) {
                                  let s = newsAlert.news_reason.trim()
                                  if (s.length > 120) s = s.slice(0, 117) + '...'
                                  newsRiskSummary = s
                                }
                              }

                              return (
                                <div key={idx} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: 8, background: '#ffffff' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.symbol}</div>
                                    <div style={{ fontSize: 11, padding: '2px 6px', borderRadius: 999, border: `1px solid ${urgencyColor}40`, color: urgencyColor }}>
                                      {urgency}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4b5563' }}>
                                    <div>
                                      <div>{p.direction} · {p.mode || p.product}</div>
                                      <div>Qty {p.quantity}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div>₹{Number(p.current_price || 0).toFixed(2)} <span style={{ fontSize: 10, color: '#9ca3af' }}>({p.price_source || 'tick'})</span></div>
                                      <div style={{ color: retColor }}>{ret.toFixed(2)}%</div>
                                    </div>
                                  </div>
                                  {newsRiskLabel && newsRiskScore != null && (
                                    <div style={{ marginTop: 6, fontSize: 11, color: '#4b5563' }}>
                                      <div style={{ fontWeight: 600, marginBottom: 2 }}>Sentiment risk</div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: newsRiskColor + '15', color: newsRiskColor }}>
                                            {newsRiskLabel} ({Math.round(newsRiskScore)}/100)
                                          </span>
                                        </div>
                                        {newsRiskSummary && (
                                          <div style={{ color: '#6b7280' }}>{newsRiskSummary}</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()
                  )}

                </div>
              </section>
            )}

            {/* Market Brief with Cards - Hidden only when picks drawer is shown */}
            {!showPicks && !showPortfolio && !showWatchlist && (
              <MarketBrief
                showPicks={showPicks}
                showPortfolio={showPortfolio}
                showWatchlist={showWatchlist}
                marketRegion={marketRegion}
                setMarketRegion={setMarketRegion}
                market={market}
                sentiment={sentiment}
                spark={spark}
                tiles={tiles}
                tip={tip}
                setTip={setTip}
                tipTimer={tipTimer}
                setTipTimer={setTipTimer}
                insights={insights}
                setInsights={setInsights}
                dismissedInsightIds={dismissedInsightIds}
                setDismissedInsightIds={setDismissedInsightIds}
                showHeatMap={showHeatMap}
                heatMapStocks={heatMapStocks}
                picks={picks}
                setChartView={setChartView}
                universe={universe}
                primaryMode={primaryMode}
                setShowPicks={setShowPicks}
              />
            )}

            {/* Top Five Picks Panel - replaces Market Brief when showPicks is true */}
            {showPicks && (
              <section
                ref={topPicksDialogRef}
                role={isMobile ? 'dialog' : undefined}
                aria-modal={isMobile ? true : undefined}
                aria-label={isMobile ? 'Top Five Picks' : undefined}
                tabIndex={isMobile ? -1 : undefined}
                style={{
                  padding: isMobile
                    ? 'calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 12px) 12px'
                    : 16,
                  border: isMobile ? 'none' : '1px solid #e5e7eb',
                  borderRadius: isMobile ? 0 : 12,
                  background: '#fff',
                  marginBottom: isMobile ? 0 : 16,
                  boxShadow: isMobile ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
                  position: isMobile ? 'fixed' : 'relative',
                  inset: isMobile ? 0 : undefined,
                  zIndex: isMobile ? LAYOUT_TOKENS.zIndex.sheet : undefined,
                  overflowY: isMobile ? 'auto' : undefined,
                  WebkitOverflowScrolling: isMobile ? 'touch' : undefined,
                  overscrollBehavior: isMobile ? 'contain' : undefined,
                }}>
                <div
                  {...swipeCloseTopPicks}
                  style={{
                    padding: '12px 0 8px 0',
                    borderBottom: '1px solid #e5e7eb',
                    marginBottom: 12,
                    position: isMobile ? 'sticky' : 'static',
                    top: isMobile ? 0 : undefined,
                    background: '#fff',
                    zIndex: 2,
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 600, fontSize: 18 }}>★ Top Five Picks</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {loadingPicks
                          ? `Agents are working… Refreshing ${primaryMode} recommendations for ${universe.toUpperCase()}`
                          : (isIndiaMarketOpen && picksAsOf
                            ? `Last updated ${dayjs(picksAsOf).fromNow()} (${formatIstTime(picksAsOf)})`
                            : '')}
                      </div>
                      {isIndiaMarketOpen && (
                        <button
                          disabled={loadingPicks}
                          onClick={() => onFetchPicks(true)}
                          style={{
                            border: '2px solid #3b82f6',
                            background: loadingPicks ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            borderRadius: 999,
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#fff',
                            cursor: loadingPicks ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: loadingPicks ? 0.7 : 1
                          }}
                        >
                          🔄 Recalculate
                        </button>
                      )}
                      <button
                        ref={topPicksCloseRef}
                        onClick={() => { setShowPicks(false); setShowHeatMap(true) }}
                        title="Close Top Five Picks"
                        aria-label="Close Top Five Picks"
                        style={{
                          border: '2px solid #ef4444',
                          background: '#fff',
                          borderRadius: 999,
                          padding: '8px 12px',
                          fontSize: 13,
                          fontWeight: 800,
                          color: '#b91c1c',
                          cursor: 'pointer',
                          boxShadow: '0 2px 10px rgba(239, 68, 68, 0.18)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          minHeight: isMobile ? 44 : 34,
                          userSelect: 'none'
                        }}
                      >
                        <span style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          border: '2px solid #ef4444',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                          fontSize: 12,
                          fontWeight: 900
                        }}>×</span>
                        Close
                      </button>
                    </div>
                  </div>
                  {picksAsOf && picks.length > 0 && (!isIndiaMarketOpen || isPreviousSessionData) && (
                    <div style={{ fontSize: 11, color: '#92400e', maxWidth: 420 }}>
                      {!isIndiaMarketOpen
                        ? "Markets are closed. These recommendations are based on data from the last trading session (around 3:15 PM). They'll refresh automatically when markets reopen."
                        : "These recommendations are from the last trading session. Fresh picks will appear automatically once the agents complete a new run for today."}
                    </div>
                  )}
                  {/* Mode Selector */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, marginBottom: 8 }}>
                      {(availableModes && availableModes.length ? availableModes : DEFAULT_AVAILABLE_MODES)
                        .filter(mode => mode.value !== 'Commodity')
                        .map(mode => {
                          const isActive = primaryMode === mode.value
                          return (
                            <button
                              key={mode.value}
                              onClick={() => {
                                if (primaryMode === mode.value) return
                                const newMode = mode.value
                                setPrimaryMode(newMode)
                                try { localStorage.setItem('arise_primary_mode', newMode) } catch { }
                              }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setTip({
                                  x: rect.left + rect.width / 2,
                                  y: rect.top - 8,
                                  text: mode.description,
                                  type: 'mode'
                                })
                              }}
                              onMouseLeave={() => setTip(null)}
                              style={{
                                border: 'none',
                                background: isActive ? '#eff6ff' : 'transparent',
                                padding: '6px 10px 10px 10px',
                                borderRadius: 6,
                                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                                cursor: 'pointer',
                                minWidth: 90
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#1d4ed8' : '#4b5563' }}>
                                {mode.display_name}
                              </div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>
                                {mode.horizon}
                              </div>
                            </button>
                          )
                        })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                      {[
                        { value: 'NIFTY50', label: 'Nifty 50', disabled: false },
                        { value: 'BANKNIFTY', label: 'Bank Nifty', disabled: false },
                        { value: 'NIFTY100', label: 'Nifty 100 (coming soon)', disabled: true },
                        { value: 'NIFTY500', label: 'Nifty 500 (coming soon)', disabled: true },
                      ].map(item => {
                        const isActive = universe === item.value
                        const isDisabled = item.disabled
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              if (isDisabled || universe === item.value) return
                              const u = item.value
                              setUniverse(u)
                              try { localStorage.setItem('arise_universe', u) } catch { }
                              onFetchPicks()
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 10px',
                              borderRadius: 999,
                              border: isActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
                              background: isActive ? '#eff6ff' : '#f9fafb',
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              opacity: isDisabled ? 0.5 : 1,
                              fontSize: 12,
                              color: isActive ? '#1d4ed8' : '#0f172a'
                            }}
                          >
                            <span
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 999,
                                border: '2px solid ' + (isActive ? '#2563eb' : '#cbd5e1'),
                                background: isActive ? '#2563eb' : '#fff'
                              }}
                            />
                            <span>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {picksSystemMessage && (
                  <div style={{
                    marginBottom: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#fef3c7',
                    border: '1px solid #facc15',
                    fontSize: 12,
                    color: '#92400e'
                  }}>
                    {picksSystemMessage}
                  </div>
                )}

                <div style={{ padding: 10 }}>
                  {loadingPicks && picks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                      <div style={{ fontSize: 14 }}>
                        {`Agents are working… Generating fresh ${primaryMode} Top Five Picks for ${universe.toUpperCase()}. `}
                        {!picksAsOf
                          ? 'The first run of the day can take up to about a minute while data loads. Later runs will be much faster.'
                          : primaryMode === 'Scalping'
                            ? 'This usually takes under a minute in Scalping mode.'
                            : 'This usually completes in a few seconds once today\'s data is cached.'}
                      </div>
                    </div>
                  ) : picks.length ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', minWidth: '930px', fontSize: 13, borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                          <tr style={{ textAlign: 'left', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                            <th style={{ padding: '10px 8px', width: '95px' }}>Symbol</th>
                            <th style={{ padding: '10px 8px', width: '75px' }}>Score</th>
                            <th style={{ padding: '10px 8px', width: '115px' }}>Current Price</th>
                            <th style={{ padding: '10px 8px', width: '130px' }}>Recommendation</th>
                            <th style={{ padding: '10px 8px' }}>Key Findings</th>
                            <th style={{ padding: '10px 8px', width: '95px', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {buyPicks.length > 0 && (
                            <React.Fragment>
                              <tr>
                                <td colSpan={6} style={{ padding: '8px 8px', fontWeight: 600, fontSize: 13, color: '#166534', background: '#ecfdf5' }}>
                                  {(primaryMode || '').toLowerCase() === 'options' ? 'Top Five Call Picks' : 'Top Five Buy Picks'}
                                </td>
                              </tr>
                              {buyPicks.map((r: any, i: number) => {
                                const score = typeof r.score_blend === 'number' ? r.score_blend : 0
                                const dir = classifyPickDirection(score, primaryMode)
                                const baseRec = dir ? dir.label : (r.recommendation || 'Buy')
                                const recommendation = formatRecommendationLabel(r, baseRec, dir)
                                const isPut = isOptionPick(r) && getOptionType(r) === 'PE'

                                const sym = String(r.symbol || '').toUpperCase()
                                const lp = livePrices[sym]
                                let isLiveTick: boolean | undefined
                                try {
                                  if (lp && typeof lp.updated_at === 'string') {
                                    const ts = new Date(lp.updated_at).getTime()
                                    if (!Number.isNaN(ts)) isLiveTick = (Date.now() - ts) <= 20000
                                  }
                                } catch {
                                  isLiveTick = undefined
                                }

                                return (
                                  <React.Fragment key={`buy-${r.symbol}-${i}`}>
                                    <tr>
                                      <td
                                        style={{
                                          padding: '10px 8px',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          color: '#2563eb',
                                          textDecoration: 'underline',
                                          textDecorationStyle: 'dotted',
                                          textDecorationColor: '#93c5fd'
                                        }}
                                        onClick={() => setChartView({ symbol: r.symbol, analysis: r })}
                                        onMouseEnter={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect()
                                          setTip({
                                            x: rect.left + rect.width / 2,
                                            y: rect.top - 8,
                                            text: '📊 Click to view interactive chart',
                                            type: 'chart'
                                          })
                                        }}
                                        onMouseLeave={() => setTip(null)}
                                      >
                                        {r.symbol}
                                      </td>
                                      <td style={{ padding: '10px 8px' }}>
                                        <span
                                          style={{ fontWeight: 600, color: getScoreColor(r.score_blend), cursor: 'pointer', fontSize: 14 }}
                                          onClick={() => setExplainPick(explainPick === r.symbol ? null : r.symbol)}
                                          onMouseEnter={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect()
                                            setTip({
                                              x: rect.left + rect.width / 2,
                                              y: rect.top - 8,
                                              text: '🤖 Click to see agent breakdown',
                                              type: 'score'
                                            })
                                          }}
                                          onMouseLeave={() => setTip(null)}
                                        >
                                          {r.score_blend}%
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#0f172a' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                                          <span>
                                            {typeof r.current_price === 'number'
                                              ? `₹${Number(r.current_price).toFixed(2)}`
                                              : (typeof r.last_price === 'number'
                                                ? `₹${Number(r.last_price).toFixed(2)}`
                                                : '-')}
                                          </span>
                                          {typeof isLiveTick === 'boolean' && (
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                padding: '2px 8px',
                                                borderRadius: 999,
                                                border: '1px solid ' + (isLiveTick ? '#86efac' : '#cbd5e1'),
                                                background: isLiveTick ? '#dcfce7' : '#f1f5f9',
                                                color: isLiveTick ? '#166534' : '#475569',
                                              }}
                                            >
                                              {isLiveTick ? 'LIVE' : 'DELAYED'}
                                            </span>
                                          )}
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            display: 'inline-block',
                                            background: isPut ? '#fef2f2' : '#dcfce7',
                                            color: isPut ? '#991b1b' : '#166534'
                                          }}>
                                            {recommendation}
                                          </span>
                                        </div>
                                      </td>
                                      <td
                                        style={{
                                          padding: '10px 8px',
                                          color: '#475569',
                                          fontSize: 13,
                                          lineHeight: 1.5
                                        }}
                                      >
                                        {r.key_findings || (() => {
                                          const scores = r.scores || {}
                                          const findings: string[] = []
                                          if (scores.technical >= 70) findings.push('strong technical setup')
                                          else if (scores.technical >= 60) findings.push('positive technicals')
                                          if (scores.sentiment >= 70) findings.push('bullish sentiment')
                                          if (scores.options >= 70) findings.push('strong options flow')
                                          if (scores.pattern >= 70) findings.push('favorable patterns')
                                          if (scores.global >= 65) findings.push('supportive global markets')
                                          if (scores.risk <= 40) findings.push('manageable risk')
                                          const text = findings.length > 0 ? findings.slice(0, 2).join(', ') + (findings.length > 2 ? '...' : '') : (r.rationale || 'Multi-agent analysis complete')
                                          return text.charAt(0).toUpperCase() + text.slice(1)
                                        })()}
                                      </td>
                                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                        <button
                                          onClick={() => onAnalyze(r)}
                                          style={{
                                            padding: '6px 16px',
                                            fontSize: 13,
                                            borderRadius: 999,
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                            color: '#fff',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.35)'
                                          }}
                                        >
                                          Analyze
                                        </button>
                                      </td>
                                    </tr>
                                    {explainPick === r.symbol && (
                                      <tr>
                                        <td colSpan={6} style={{ padding: '12px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                                          {r.agents && r.agents.length > 0 && (() => {
                                            const utilityAgents = ['trade_strategy', 'auto_monitoring', 'personalization']
                                            const scoringAgents = r.agents.filter((a: any) => !utilityAgents.includes(a.agent))
                                            const agentVotes = scoringAgents.map((a: any) => ({
                                              name: a.agent || 'unknown',
                                              icon: '🤖',
                                              vote: a.score >= 60 ? 'bullish' : a.score <= 40 ? 'bearish' : 'neutral',
                                              confidence: a.confidence || 'Medium',
                                              score: a.score || 50
                                            }))
                                            const bullishCount = agentVotes.filter((a: any) => a.vote === 'bullish').length
                                            const consensus = bullishCount > agentVotes.length / 2 ? 'bullish' :
                                              bullishCount < agentVotes.length / 3 ? 'bearish' : 'mixed'
                                            const consensusStrength = Math.abs((bullishCount / agentVotes.length) - 0.5) * 200
                                            return (
                                              <div style={{ marginBottom: 16 }}>
                                                <AgentConsensus
                                                  symbol={r.symbol}
                                                  agents={agentVotes}
                                                  consensus={consensus}
                                                  consensusStrength={consensusStrength}
                                                />
                                              </div>
                                            )
                                          })()}
                                          <div style={{ display: 'grid', gap: 12 }}>
                                            <div>
                                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Confidence:</div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                                                  <div style={{
                                                    width: `${r.score_blend}%`,
                                                    height: '100%',
                                                    background: getScoreColor(r.score_blend),
                                                    transition: 'width 0.3s'
                                                  }} />
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: getScoreColor(r.score_blend) }}>
                                                  {r.score_blend}% {r.score_blend >= 70 ? 'High' : r.score_blend >= 50 ? 'Medium' : r.score_blend >= 30 ? 'Low' : 'Very Low'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                )
                              })}
                            </React.Fragment>
                          )}

                          {sellPicks.length > 0 && (
                            <React.Fragment>
                              <tr>
                                <td colSpan={6} style={{ padding: '8px 8px', fontWeight: 600, fontSize: 13, color: '#991b1b', background: '#fef2f2' }}>
                                  {(primaryMode || '').toLowerCase() === 'options' ? 'Top Five Put Picks' : 'Top Five Sell Picks'}
                                </td>
                              </tr>
                              {sellPicks.map((r: any, i: number) => {
                                const score = typeof r.score_blend === 'number' ? r.score_blend : 0
                                const dir = classifyPickDirection(score, primaryMode)
                                const baseRec = dir ? dir.label : (r.recommendation || 'Sell')
                                const recommendation = formatRecommendationLabel(r, baseRec, dir)
                                const isPut = isOptionPick(r) && getOptionType(r) === 'PE'
                                const sym = String(r.symbol || '').toUpperCase()
                                const lp = livePrices[sym]
                                let isLiveTick: boolean | undefined
                                try {
                                  if (lp && typeof lp.updated_at === 'string') {
                                    const ts = new Date(lp.updated_at).getTime()
                                    if (!Number.isNaN(ts)) isLiveTick = (Date.now() - ts) <= 20000
                                  }
                                } catch {
                                  isLiveTick = undefined
                                }

                                return (
                                  <React.Fragment key={`sell-${r.symbol}-${i}`}>
                                    <tr>
                                      <td
                                        style={{
                                          padding: '10px 8px',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          color: '#2563eb',
                                          textDecoration: 'underline',
                                          textDecorationStyle: 'dotted',
                                          textDecorationColor: '#93c5fd'
                                        }}
                                        onClick={() => setChartView({ symbol: r.symbol, analysis: r })}
                                        onMouseEnter={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect()
                                          setTip({
                                            x: rect.left + rect.width / 2,
                                            y: rect.top - 8,
                                            text: '📊 Click to view interactive chart',
                                            type: 'chart'
                                          })
                                        }}
                                        onMouseLeave={() => setTip(null)}
                                      >
                                        {r.symbol}
                                      </td>
                                      <td style={{ padding: '10px 8px' }}>
                                        <span
                                          style={{ fontWeight: 600, color: getScoreColor(r.score_blend), cursor: 'pointer', fontSize: 14 }}
                                          onClick={() => setExplainPick(explainPick === r.symbol ? null : r.symbol)}
                                          onMouseEnter={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect()
                                            setTip({
                                              x: rect.left + rect.width / 2,
                                              y: rect.top - 8,
                                              text: '🤖 Click to see agent breakdown',
                                              type: 'score'
                                            })
                                          }}
                                          onMouseLeave={() => setTip(null)}
                                        >
                                          {r.score_blend}%
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#0f172a' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                                          <span>
                                            {typeof r.current_price === 'number'
                                              ? `₹${Number(r.current_price).toFixed(2)}`
                                              : (typeof r.last_price === 'number'
                                                ? `₹${Number(r.last_price).toFixed(2)}`
                                                : '-')}
                                          </span>
                                          {typeof isLiveTick === 'boolean' && (
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                padding: '2px 8px',
                                                borderRadius: 999,
                                                border: '1px solid ' + (isLiveTick ? '#86efac' : '#cbd5e1'),
                                                background: isLiveTick ? '#dcfce7' : '#f1f5f9',
                                                color: isLiveTick ? '#166534' : '#475569',
                                              }}
                                            >
                                              {isLiveTick ? 'LIVE' : 'DELAYED'}
                                            </span>
                                          )}
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            display: 'inline-block',
                                            background: isPut ? '#fef2f2' : '#dcfce7',
                                            color: isPut ? '#991b1b' : '#166534'
                                          }}>
                                            {recommendation}
                                          </span>
                                        </div>
                                      </td>
                                      <td
                                        style={{
                                          padding: '10px 8px',
                                          color: '#475569',
                                          fontSize: 13,
                                          lineHeight: 1.5
                                        }}
                                      >
                                        {r.key_findings || (() => {
                                          const scores = r.scores || {}
                                          const findings: string[] = []
                                          if (scores.technical >= 70) findings.push('strong technical setup')
                                          else if (scores.technical >= 60) findings.push('positive technicals')
                                          if (scores.sentiment >= 70) findings.push('bullish sentiment')
                                          if (scores.options >= 70) findings.push('strong options flow')
                                          if (scores.pattern >= 70) findings.push('favorable patterns')
                                          if (scores.global >= 65) findings.push('supportive global markets')
                                          if (scores.risk <= 40) findings.push('manageable risk')
                                          const text = findings.length > 0 ? findings.slice(0, 2).join(', ') + (findings.length > 2 ? '...' : '') : (r.rationale || 'Multi-agent analysis complete')
                                          return text.charAt(0).toUpperCase() + text.slice(1)
                                        })()}
                                      </td>
                                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                        <button
                                          onClick={() => onAnalyze(r)}
                                          style={{
                                            padding: '6px 16px',
                                            fontSize: 13,
                                            borderRadius: 999,
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                            color: '#fff',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.35)'
                                          }}
                                        >
                                          Analyze
                                        </button>
                                      </td>
                                    </tr>
                                    {explainPick === r.symbol && (
                                      <tr>
                                        <td colSpan={6} style={{ padding: '12px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                                          {r.agents && r.agents.length > 0 && (() => {
                                            const utilityAgents = ['trade_strategy', 'auto_monitoring', 'personalization']
                                            const scoringAgents = r.agents.filter((a: any) => !utilityAgents.includes(a.agent))
                                            const agentVotes = scoringAgents.map((a: any) => ({
                                              name: a.agent || 'unknown',
                                              icon: '🤖',
                                              vote: a.score >= 60 ? 'bullish' : a.score <= 40 ? 'bearish' : 'neutral',
                                              confidence: a.confidence || 'Medium',
                                              score: a.score || 50
                                            }))
                                            const bullishCount = agentVotes.filter((a: any) => a.vote === 'bullish').length
                                            const consensus = bullishCount > agentVotes.length / 2 ? 'bullish' :
                                              bullishCount < agentVotes.length / 3 ? 'bearish' : 'mixed'
                                            const consensusStrength = Math.abs((bullishCount / agentVotes.length) - 0.5) * 200
                                            return (
                                              <div style={{ marginBottom: 16 }}>
                                                <AgentConsensus
                                                  symbol={r.symbol}
                                                  agents={agentVotes}
                                                  consensus={consensus}
                                                  consensusStrength={consensusStrength}
                                                />
                                              </div>
                                            )
                                          })()}
                                          <div style={{ display: 'grid', gap: 12 }}>
                                            <div>
                                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Confidence:</div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                                                  <div style={{
                                                    width: `${r.score_blend}%`,
                                                    height: '100%',
                                                    background: getScoreColor(r.score_blend),
                                                    transition: 'width 0.3s'
                                                  }} />
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: getScoreColor(r.score_blend) }}>
                                                  {r.score_blend}% {r.score_blend >= 70 ? 'High' : r.score_blend >= 50 ? 'Medium' : r.score_blend >= 30 ? 'Low' : 'Very Low'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                )
                              })}
                            </React.Fragment>
                          )}

                          {buyPicks.length === 0 && sellPicks.length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ padding: '12px 8px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                                No directional Buy/Sell picks are available for this mode right now.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
                      No picks are available right now. Try again during market hours or switch your trading mode.
                    </div>
                  )}
                </div>

              </section>
            )}

            {/* Recent Developments - Hidden per UI cleanup. Will be available as Widget in Preferences */}
            {false && !showPicks && (
              <section style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>Recent Developments</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{eventsAsOf ? `Updated ${formatIstTime(eventsAsOf)}` : ''}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  {events.slice(0, 4).length ? events.slice(0, 4).map((n: any, idx: number) => (
                    <a
                      key={idx}
                      href={n.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 10, textDecoration: 'none', color: 'inherit', cursor: n.url ? 'pointer' : 'default', transition: 'all 0.2s', background: '#fff' }}
                      onMouseEnter={e => { if (n.url) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e5e7eb' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: String(n.source || '').toLowerCase().includes('nse') ? '#dcfce7' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: String(n.source || '').toLowerCase().includes('nse') ? '#166534' : '#1e40af' }}>
                          {String(n.source || 'N')[0]}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{n.ts ? formatIstTime(n.ts) : ''}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 8 }}>
                          {String(n.summary || n.title).slice(0, 120)}{String(n.summary || n.title).length > 120 ? '...' : ''}
                        </div>
                        <div>
                          {(() => {
                            const src = String(n.source || '')
                            const style: React.CSSProperties = { padding: '2px 6px', borderRadius: 10 }
                            if (src.toLowerCase().includes('nse')) { style.background = '#e6f6ec'; style.color = '#166534' }
                            else if (src.toLowerCase().includes('yahoo')) { style.background = '#eef2ff'; style.color = '#3730a3' }
                            else if (src.toLowerCase().includes('alpha')) { style.background = '#fef3c7'; style.color = '#92400e' }
                            else if (src.toLowerCase().includes('finnhub')) { style.background = '#f1f5f9'; style.color = '#0f172a' }
                            else { style.background = '#e5e7eb'; style.color = '#111827' }
                            return <span style={style}>{n.source}</span>
                          })()}
                        </div>
                      </div>
                    </a>
                  )) : <div style={{ fontSize: 12, opacity: 0.7 }}>No events or announcements</div>}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Right rail: News & Top Picks Button */}
        {!showPicks && !showPortfolio && !showWatchlist && (
          <aside style={{ width: isMobile ? '100%' : 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => onFetchPicks()}
              disabled={showPicks || loadingPicks}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: (showPicks || loadingPicks) ? '#6b7280' : 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)',
                color: '#fff',
                border: '1px solid rgba(0,149,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: (showPicks || loadingPicks) ? 'not-allowed' : 'pointer',
                opacity: (showPicks || loadingPicks) ? 0.7 : 1,
                boxShadow: (showPicks || loadingPicks) ? 'none' : '0 4px 10px rgba(0,149,255,0.25)'
              }}
            >
              <span>{loadingPicks ? '⏳ Loading...' : '★ Top Five Picks'}</span>
              <span style={{ fontSize: 11, background: '#f1f5f9', color: '#0f172a', padding: '2px 6px', borderRadius: 999 }}>
                {(() => {
                  try {
                    const freshnessMins = primaryMode === 'Scalping' ? 10 : 60
                    const now = new Date()

                    const formatIfFresh = (iso: string): string => {
                      if (!iso) return ''
                      const d = new Date(iso)
                      if (Number.isNaN(d.getTime())) return ''
                      const diffMs = now.getTime() - d.getTime()
                      const diffMins = Math.floor(diffMs / 60000)
                      if (diffMins < 0 || diffMins > freshnessMins) return ''
                      if (!isWithinLastTradingSession(iso)) return ''
                      return formatIstTime(d)
                    }

                    // Prefer live picks timestamp
                    let label = ''
                    if (picksAsOf) {
                      label = formatIfFresh(picksAsOf)
                    }

                    // Fallback to cached picks if live label is empty
                    if (!label) {
                      const cachedRaw = localStorage.getItem('arise_picks') || 'null'
                      const p = JSON.parse(cachedRaw)
                      if (p?.as_of) {
                        label = formatIfFresh(p.as_of)
                      }
                    }

                    return label || ''
                  } catch { }
                  return ''
                })()}
              </span>
            </button>
            {
              !isMobile &&
              <News
                news={news}
                newsAsOf={newsAsOf}
                newsExpanded={newsExpanded}
                setNewsExpanded={setNewsExpanded}
              />
            }
          </aside>
        )}
      </div>

      {/* Compact Trading Strategy Modal - Fits on One Page */}
      {analyze && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }} onClick={() => setAnalyze(null)}>
          <div style={{ width: 'min(900px, 90vw)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            {/* Compact Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid #e5e7eb' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>⚡</span>
                  <div style={{ fontWeight: 700, fontSize: 20, color: '#0f172a' }}>Trading Strategy: {analyze.symbol}</div>
                </div>
              </div>
              <button onClick={() => setAnalyze(null)} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>

            {analyze.plan ? (
              <TradeStrategyPanel
                symbol={analyze.symbol}
                plan={analyze.plan}
                blendScore={analyze.blendScore}
                strategyRationale={analyze.strategyRationale}
                scores={analyze.scores}
                recommendation={analyze.recommendation}
                primaryMode={primaryMode}
                availableModes={availableModes}
                accountId={accountProfile.account_id}
                sessionId={sessionId}
              />
            ) : (
              <div style={{ fontSize: 13, color: '#64748b', padding: 30, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                <div>Generating strategy...</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RL Metrics Modal */}
      {showRlMetrics && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1001,
          }}
          onClick={() => setShowRlMetrics(false)}
        >
          <div
            style={{
              width: 'min(900px, 90vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'linear-gradient(135deg, #eef2ff 0%, #ecfeff 100%)',
              borderRadius: 16,
              border: '2px solid #4f46e5',
              padding: 24,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <SquareActivity size={24} color="#4f46e5" />
                  <div style={{ fontWeight: 700, fontSize: 22, color: '#1e293b' }}>RL Exit Profiles & Bandit Metrics</div>
                </div>
                <div style={{ fontSize: 13, color: '#475569' }}>Monitor how the RL loop is learning per mode: trades, returns, drawdowns, win rate, and best profiles.</div>
              </div>
              <button
                onClick={() => setShowRlMetrics(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 28,
                  cursor: 'pointer',
                  color: '#4b5563',
                }}
              >
                &times;
              </button>
            </div>

            {loadingRlMetrics && (
              <div style={{ padding: 16, textAlign: 'center', color: '#1e293b', fontSize: 14 }}>Loading RL metrics...</div>
            )}

            {!loadingRlMetrics && rlMetricsError && (
              <div style={{ padding: 12, marginBottom: 12, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13 }}>
                {rlMetricsError}
              </div>
            )}

            {!loadingRlMetrics && !rlMetricsError && (!rlMetricsData || !rlMetricsData.policy) && (
              <div style={{ padding: 16, fontSize: 14, color: '#1e293b' }}>
                No ACTIVE RL policy or metrics found yet. The nightly RL job will populate metrics after it runs for a few sessions.
              </div>
            )}

            {!loadingRlMetrics && !rlMetricsError && rlMetricsData && rlMetricsData.policy && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Daily performance summary */}
                {Array.isArray(rlDailyData) && rlDailyData.length > 0 && (
                  <div style={{ padding: 12, borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 6 }}>
                      Recent Daily Performance (per mode)
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
                      One row per trade date × mode. Alpha is avg return %, drawdown is avg max drawdown %.
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: '#e5e7eb' }}>
                            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #d1d5db' }}>Date</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #d1d5db' }}>Mode</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #d1d5db' }}>Trades</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #d1d5db' }}>Alpha %</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #d1d5db' }}>Drawdown %</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #d1d5db' }}>Win Rate %</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #d1d5db' }}>Hit Target %</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #d1d5db' }}>Hit Stop %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rlDailyData!.map((d: any, idx: number) => (
                            <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{d.date}</td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{d.mode}</td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{d.trades}</td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{d.avg_ret_close_pct.toFixed(2)}</td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{d.avg_max_drawdown_pct.toFixed(2)}</td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{d.win_rate.toFixed(1)}</td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{d.hit_target_rate.toFixed(1)}</td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{d.hit_stop_rate.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Policy summary */}
                <div style={{ padding: 12, borderRadius: 10, background: '#e0f2fe', border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: 14, color: '#0f172a' }}>
                    <strong>Active Policy:</strong> {rlMetricsData.policy.name} ({rlMetricsData.policy.policy_id})
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                    Status: <strong>{rlMetricsData.policy.status}</strong>
                    {rlMetricsData.policy.activated_at && (
                      <>
                        {' '}• Activated at: <span>{rlMetricsData.policy.activated_at}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Per-mode exit profile metrics */}
                {Array.isArray(rlMetricsData.modes) && rlMetricsData.modes.length === 0 && (
                  <div style={{ padding: 16, fontSize: 14, color: '#1e293b' }}>
                    Policy is active but no exit profile metrics have been recorded yet. Once nightly RL runs with enough data, modes will appear here.
                  </div>
                )}

                {Array.isArray(rlMetricsData.modes) && rlMetricsData.modes.map((m: any) => (
                  <div key={m.mode} style={{ borderRadius: 12, border: '1px solid #c7d2fe', background: '#eff6ff', padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>
                          Mode: {m.mode}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                          {m.sample && m.sample.start_date && m.sample.end_date ? (
                            <>
                              Sample window: <strong>{m.sample.start_date}</strong> → <strong>{m.sample.end_date}</strong>
                              {m.sample.evaluation_horizon && (
                                <> • Horizon: <strong>{m.sample.evaluation_horizon}</strong></>
                              )}
                            </>
                          ) : (
                            <>Sample window: not recorded</>
                          )}
                          {m.last_evaluated_at && (
                            <>
                              {' '}• Last evaluated: <span>{m.last_evaluated_at}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#4b5563', textAlign: 'right' }}>
                        <div><strong>Bandit contexts:</strong> {m.bandit?.contexts ?? 0}</div>
                        <div><strong>Bandit actions:</strong> {m.bandit?.actions ?? 0}</div>
                      </div>
                    </div>

                    {Array.isArray(m.profiles) && m.profiles.length > 0 ? (
                      <div style={{ overflowX: 'auto', marginTop: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#dbeafe' }}>
                              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #bfdbfe' }}>Profile</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #bfdbfe' }}>Trades</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #bfdbfe' }}>Avg Return %</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #bfdbfe' }}>Max Drawdown %</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #bfdbfe' }}>Win Rate %</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #bfdbfe' }}>Hit Target %</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #bfdbfe' }}>Hit Stop %</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #bfdbfe' }}>Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.profiles.map((p: any) => {
                              const isBest = !!p.is_best
                              return (
                                <tr key={p.id} style={{ background: isBest ? '#fef9c3' : 'transparent' }}>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', fontWeight: isBest ? 600 : 400 }}>
                                    {p.id}
                                    {isBest && <span style={{ marginLeft: 6, fontSize: 11, color: '#92400e' }}>BEST</span>}
                                  </td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{p.trades}</td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{p.avg_ret_close_pct.toFixed(2)}</td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{p.avg_max_drawdown_pct.toFixed(2)}</td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{p.win_rate.toFixed(1)}</td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{p.hit_target_rate.toFixed(1)}</td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{p.hit_stop_rate.toFixed(1)}</td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{p.score.toFixed(2)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                        No exit profile metrics recorded yet for this mode.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Winning Trades Modal */}
      <WinningTradesModal
        isOpen={showWinningTrades}
        onClose={() => setShowWinningTrades(false)}
        isMobile={isMobile}
        winningTradesData={winningTradesData}
        loadingWinningTrades={loadingWinningTrades}
        winningTradesMode={winningTradesMode}
        setWinningTradesMode={setWinningTradesMode}
        winningTradesDate={winningTradesDate}
        setWinningTradesDate={setWinningTradesDate}
        winningTradesAvailableDates={winningTradesAvailableDates}
        winningStrategiesData={winningStrategiesData}
        availableModes={availableModes}
        DEFAULT_AVAILABLE_MODES={DEFAULT_AVAILABLE_MODES}
        tip={tip}
        setTip={setTip}
      />

      {/* Old inline modal - to be removed */}
      {false && showWinningTrades && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: isMobile ? '#ffffff' : 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: isMobile ? 'stretch' : 'center',
            padding: isMobile ? 0 : 20,
            zIndex: 1001,
            overscrollBehavior: isMobile ? 'contain' : undefined,
          }}
          onClick={() => setShowWinningTrades(false)}
        >
          <button
            ref={winnersCloseRef}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              try { (e as any).nativeEvent?.stopImmediatePropagation?.() } catch { }
              setShowWinningTrades(false)
            }}
            style={{
              position: 'fixed',
              top: isMobile ? 'calc(env(safe-area-inset-top) + 12px)' : 16,
              right: 16,
              zIndex: 1010,
              width: isMobile ? 44 : 40,
              height: isMobile ? 44 : 40,
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.6)',
              background: 'rgba(255,255,255,0.95)',
              color: '#0f172a',
              fontSize: 26,
              lineHeight: '26px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
            }}
            aria-label="Close Winning Trades"
            title="Close (Esc)"
          >
            ×
          </button>
          <div
            ref={winnersDialogRef}
            role="dialog"
            aria-modal={true}
            aria-label="Winning Trades"
            tabIndex={-1}
            style={{
              width: isMobile ? '100vw' : 'min(1000px, 90vw)',
              height: isMobile ? '100dvh' : undefined,
              maxHeight: isMobile ? '100dvh' : '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: isMobile ? 0 : 16,
              padding: isMobile
                ? 'calc(env(safe-area-inset-top) + 12px) 16px calc(env(safe-area-inset-bottom) + 16px) 16px'
                : 24,
              border: isMobile ? 'none' : '1px solid #e2e8f0',
              boxShadow: isMobile ? 'none' : '0 18px 50px rgba(2,6,23,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              {...swipeCloseWinners}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                position: isMobile ? 'sticky' : 'static',
                top: isMobile ? 0 : undefined,
                background: '#ffffff',
                zIndex: 2,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 32 }}>🏆</span>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 24,
                          color: '#0f172a',
                        }}
                      >
                        Winning Trades
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      Track Alpha Generated Across Trading Modes
                    </div>
                  </div>
                  {/* Live Indicator - only show LIVE when market is open */}
                  {winningTradesData?.as_of && (() => {
                    const now = new Date()
                    const nowIst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
                    const day = nowIst.getDay()
                    const isWeekday = day >= 1 && day <= 5
                    const hours = nowIst.getHours()
                    const minutes = nowIst.getMinutes()
                    const currentTime = hours * 60 + minutes
                    const marketOpen = 9 * 60 + 15
                    const marketClose = 15 * 60 + 30
                    const intradayWindowOpen =
                      isWeekday && currentTime >= marketOpen && currentTime <= marketClose

                    const asOfDate = new Date(winningTradesData.as_of)
                    const isSameDay = isWithinTodayIst(winningTradesData.as_of)
                    const isMarketOpen = intradayWindowOpen && isSameDay

                    const updatedLabel = (() => {
                      try {
                        const diffMs = now.getTime() - asOfDate.getTime()
                        const diffMins = Math.floor(diffMs / 60000)
                        if (diffMins < 1) return 'just now'
                        if (diffMins === 1) return '1 min ago'
                        if (diffMins < 60) return `${diffMins} mins ago`
                        const diffHours = Math.floor(diffMins / 60)
                        if (diffHours === 1) return '1 hour ago'
                        return `${diffHours} hours ago`
                      } catch {
                        return 'recently'
                      }
                    })()

                    const closedLabel = (() => {
                      try {
                        const dateStr = formatIstDate(asOfDate, { weekday: 'short' })

                        if (isSameDay) {
                          return 'As of market close today'
                        }

                        return `As of market close on ${dateStr}`
                      } catch {
                        return 'As of last market close'
                      }
                    })()

                    return (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 4,
                          marginRight: 14,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            background: isMarketOpen ? '#dcfce7' : '#f1f5f9',
                            borderRadius: 999,
                            border: isMarketOpen
                              ? '1px solid #bbf7d0'
                              : '1px solid #e2e8f0',
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: isMarketOpen ? '#16a34a' : '#94a3b8',
                              animation: isMarketOpen ? 'pulse 2s infinite' : 'none',
                            }}
                          ></div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: isMarketOpen ? '#166534' : '#64748b',
                            }}
                          >
                            {isMarketOpen ? 'Live' : 'Market Closed'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                          {isMarketOpen ? `Updated ${updatedLabel}` : closedLabel}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
              <button
                onClick={() => setShowWinningTrades(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 28,
                  cursor: 'pointer',
                  color: '#64748b',
                  lineHeight: 1,
                  padding: 0,
                  alignSelf: 'flex-start',
                  marginTop: -6,
                }}
              >
                &times;
              </button>
            </div>

            {/* Mode Filters with Win Rate Badges */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0f172a',
                  marginBottom: 8,
                }}
              >
                TRADING MODE
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['All', 'Scalping', 'Intraday', 'Swing', 'Options', 'Futures'].map(
                  (mode) => {
                    const isActive = winningTradesMode === mode

                    const modeConfig =
                      mode === 'All'
                        ? null
                        : (availableModes || DEFAULT_AVAILABLE_MODES).find(
                          (m) => String(m.value).toLowerCase() === mode.toLowerCase(),
                        )

                    const tooltip =
                      mode === 'All'
                        ? 'Show performance across all trading modes'
                        : modeConfig?.description || `${mode} mode`

                    return (
                      <label
                        key={mode}
                        onClick={() => setWinningTradesMode(mode)}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTip({
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                            text: tooltip,
                            type: 'mode',
                          })
                        }}
                        onMouseLeave={() => setTip(null)}
                        style={{
                          position: 'relative',
                          padding: '8px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 999,
                          border: isActive
                            ? '2px solid #14b8a6'
                            : '1px solid #e2e8f0',
                          background: isActive
                            ? '#ecfeff'
                            : '#ffffff',
                          color: '#0f172a',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="radio"
                          name="winning_trades_mode"
                          value={mode}
                          checked={isActive}
                          onChange={() => setWinningTradesMode(mode)}
                          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                        />
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            border: isActive
                              ? '3px solid #14b8a6'
                              : '2px solid #94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#ffffff',
                          }}
                        >
                          {isActive && (
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#14b8a6',
                              }}
                            />
                          )}
                        </div>
                        <span>{mode}</span>
                      </label>
                    )
                  },
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            {loadingWinningTrades ? (
              <div
                style={{ textAlign: 'center', padding: 40, color: '#78350f' }}
              >
                Loading performance data...
              </div>
            ) : winningTradesData ? (
              (() => {
                // Calculate KPIs based on current filter
                let filteredRecs = winningTradesData?.recommendations || []
                if (winningTradesMode !== 'All') {
                  filteredRecs = filteredRecs.filter(
                    (r: any) => r.mode === winningTradesMode,
                  )
                }
                if (winningTradesDate !== 'all') {
                  filteredRecs = filteredRecs.filter(
                    (r: any) => r.recommended_date === winningTradesDate,
                  )
                }

                // Calculate metrics for filtered data
                const wins = filteredRecs.filter((r: any) => r.return_pct > 0)
                const winRate =
                  filteredRecs.length > 0
                    ? ((wins.length / filteredRecs.length) * 100).toFixed(1)
                    : '0.0'
                const avgReturn =
                  filteredRecs.length > 0
                    ? (
                      filteredRecs.reduce(
                        (sum: number, r: any) => sum + r.return_pct,
                        0,
                      ) / filteredRecs.length
                    ).toFixed(2)
                    : '0.00'

                // Choose benchmark: per-day when a specific date is selected, else window-level benchmark_return
                let benchmark =
                  typeof winningTradesData?.metrics?.benchmark_return === 'number'
                    ? winningTradesData.metrics.benchmark_return
                    : 1.0
                if (winningTradesDate !== 'all') {
                  const ts = (winningTradesData as any)?.benchmark_timeseries
                  const perDay =
                    ts && typeof ts[winningTradesDate] === 'number'
                      ? ts[winningTradesDate]
                      : undefined
                  if (typeof perDay === 'number') {
                    benchmark = perDay
                  }
                }

                const alphaGen = (parseFloat(avgReturn) - benchmark).toFixed(2) // vs NIFTY
                const totalPicks = filteredRecs.length
                const uniqueSymbols = new Set(
                  filteredRecs.map((r: any) => r.symbol),
                ).size

                const avgReturnNum = parseFloat(avgReturn)
                const alphaNum = parseFloat(alphaGen)

                const avgReturnColor =
                  avgReturnNum > 0 ? '#16a34a' : avgReturnNum < 0 ? '#ef4444' : '#0f172a'

                const alphaColor =
                  alphaNum > 0 ? '#16a34a' : alphaNum < 0 ? '#ef4444' : '#0f172a'

                const kpiCardStyle: React.CSSProperties = {
                  background: '#ffffff',
                  padding: 16,
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
                }

                return (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 16,
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        ...kpiCardStyle,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        WIN RATE
                      </div>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        {winRate}%
                      </div>
                      <div
                        style={{ fontSize: 11, color: '#64748b' }}
                      >
                        {winningTradesMode === 'All'
                          ? 'All modes'
                          : winningTradesMode}
                      </div>
                    </div>
                    <div
                      style={{
                        ...kpiCardStyle,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        AVG RETURN
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: avgReturnColor,
                          marginBottom: 4,
                        }}
                      >
                        {avgReturnNum >= 0 ? '+' : ''}
                        {avgReturn}%
                      </div>
                      <div
                        style={{ fontSize: 11, color: '#64748b' }}
                      >
                        Per recommendation
                      </div>
                    </div>
                    <div
                      style={{
                        ...kpiCardStyle,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        ALPHA GENERATED
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: alphaColor,
                          marginBottom: 4,
                        }}
                      >
                        {alphaNum >= 0 ? '+' : ''}
                        {alphaGen}%
                      </div>
                      <div
                        style={{ fontSize: 11, color: '#64748b' }}
                      >
                        vs NIFTY50
                      </div>
                    </div>
                    <div
                      style={{
                        ...kpiCardStyle,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        TOTAL PICKS
                      </div>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        {totalPicks}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#64748b',
                          lineHeight: 1.4,
                        }}
                      >
                        <div>Filtered results</div>
                        <div>Unique symbols: {uniqueSymbols}</div>
                      </div>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div
                style={{ textAlign: 'center', padding: 40, color: '#78350f' }}
              >
                No performance data available
              </div>
            )}

            {/* Top Winning Trades Table */}
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 16,
                border: '1px solid #e5e7eb',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    Top Winning Trades
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Performance tracked since recommendation • Sorted by Returns
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    ! icon marks strategy advisories (trend weakening, volume fade, price stretched) and does not indicate an executed exit.
                  </div>
                </div>
                {/* Date Filter */}
                <select
                  value={winningTradesDate}
                  onChange={(e) => setWinningTradesDate(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: '2px solid #e5e7eb',
                    background: '#fff',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Dates</option>
                  {winningTradesAvailableDates.map((d) => {
                    try {
                      const dt = new Date(d)
                      const label = formatIstDate(dt)
                      return (
                        <option key={d} value={d}>
                          {label}
                        </option>
                      )
                    } catch {
                      return null
                    }
                  })}
                </select>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '8px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      Symbol
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '8px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      Mode
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '8px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      Recommended
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '8px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      Exit Time
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '8px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      Entry Price
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '8px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      Exit / Last Price
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '8px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      Return Profile
                    </th>
                    <th
                      style={{
                        textAlign: 'center',
                        padding: '8px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        textAlign: 'center',
                        padding: '8px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      Days Held
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let recs = winningTradesData?.recommendations || []
                    // Filter by mode
                    if (winningTradesMode !== 'All') {
                      recs = recs.filter((r: any) => r.mode === winningTradesMode)
                    }
                    // Filter by date
                    if (winningTradesDate !== 'all') {
                      recs = recs.filter(
                        (r: any) => r.recommended_date === winningTradesDate,
                      )
                    }
                    // Sort by return_pct (highest first)
                    recs = [...recs].sort(
                      (a: any, b: any) => b.return_pct - a.return_pct,
                    )

                    return recs.map((row: any, idx: number) => {
                      const statusRaw = String(row.status || '').toUpperCase()
                      const statusColor = statusRaw.includes('TP') || statusRaw.includes('TARGET')
                        ? '#16a34a'
                        : statusRaw.includes('STOP')
                          ? '#ef4444'
                          : statusRaw.includes('CLOSED')
                            ? '#64748b'
                            : statusRaw.includes('CONTEXT')
                              ? '#f97316'
                              : '#3b82f6'

                      const daysHeld = (() => {
                        try {
                          const mode = String(row.mode || 'Swing')

                          // Scalping & Intraday are intraday-only by design.
                          if (mode === 'Scalping' || mode === 'Intraday') {
                            return 0
                          }

                          const recDate = new Date(row.recommended_date)
                          const baseRec = new Date(
                            recDate.getFullYear(),
                            recDate.getMonth(),
                            recDate.getDate(),
                          )

                          const rawExit = (row as any).exit_time
                          if (rawExit) {
                            const exitDate = new Date(rawExit)
                            const baseExit = new Date(
                              exitDate.getFullYear(),
                              exitDate.getMonth(),
                              exitDate.getDate(),
                            )
                            const diffMs = baseExit.getTime() - baseRec.getTime()
                            const diffDays = Math.floor(
                              diffMs / (1000 * 60 * 60 * 24),
                            )
                            return Math.max(diffDays, 0)
                          }

                          // Fallback for open trades: approximate trading days
                          // from recommendation date up to yesterday.
                          const today = new Date()
                          if (baseRec.toDateString() === today.toDateString()) {
                            return 0
                          }

                          const end = new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            today.getDate() - 1,
                          )

                          let d = new Date(baseRec)
                          let count = 0
                          while (d <= end) {
                            const day = d.getDay()
                            if (day >= 1 && day <= 5) count += 1
                            d.setDate(d.getDate() + 1)
                          }

                          return Math.max(count, 0)
                        } catch {
                          return 0
                        }
                      })()

                      const statusDetail = (() => {
                        if (!statusRaw.includes('CONTEXT')) return null
                        const rawExitReason = (row as any)?.exit_reason
                        if (typeof rawExitReason === 'string' && rawExitReason.trim()) {
                          const cleaned = rawExitReason.replace(/_/g, ' ').trim()
                          const lower = cleaned.toLowerCase()
                          if (lower && lower !== 'context invalidated') {
                            return cleaned.length > 52 ? cleaned.slice(0, 49) + '...' : cleaned
                          }
                        }
                        const msg = String((row as any)?.strategy_exit?.message || '')
                        if (!msg) return null
                        let m = msg.replace(/^S\d+\s*/i, '').trim()
                        const lowerMsg = m.toLowerCase()
                        const idxCtx = lowerMsg.indexOf('context invalidated:')
                        if (idxCtx >= 0) {
                          m = m.slice(idxCtx + 'context invalidated:'.length).trim()
                        }
                        const colon = m.indexOf(':')
                        if (colon >= 0 && colon <= 24) {
                          m = m.slice(colon + 1).trim()
                        }
                        const short = (m.split('.').shift() || m).trim()
                        if (!short || short.toLowerCase() === 'context invalidated') return null
                        if (short.length > 52) return short.slice(0, 49) + '...'
                        return short
                      })()

                      // Optional tooltip for non-exit strategy advisories
                      // (e.g. S2_TREND_WEAKENING, S2_VOLUME_FADE, S3_BAND_STRETCHED)
                      let advisoryTooltipTitle: string | null = null
                      {
                        const se: any = (row as any).strategy_exit
                        try {
                          if (se && se.is_exit === false) {
                            const kindRaw = String(se.kind || '').toUpperCase()
                            let kindLabel = ''
                            if (kindRaw === 'TREND_WEAKENING') kindLabel = 'Trend weakening'
                            else if (kindRaw === 'VOLUME_FADE') kindLabel = 'Volume fade'
                            else if (kindRaw === 'PRICE_STRETCHED') kindLabel = 'Price stretched'
                            else if (kindRaw) {
                              const cleaned = kindRaw.replace(/_/g, ' ').toLowerCase()
                              kindLabel = cleaned.replace(/\b\w/g, (c) => c.toUpperCase())
                            }

                            const msgRaw = String(se.message || '').trim()
                            let msg = msgRaw
                            if (msg.length > 160) msg = msg.slice(0, 157) + '...'

                            const parts: string[] = []
                            if (kindLabel) parts.push(kindLabel)
                            if (msg) parts.push(msg)

                            const title = parts.join(' • ')
                            advisoryTooltipTitle = title || null
                          }
                        } catch {
                          advisoryTooltipTitle = advisoryTooltipTitle
                        }
                      }

                      let newsRiskLabel: string | null = null
                      let newsRiskScore: number | null = null
                      let newsRiskColor = '#6b7280'
                      let newsRiskSummary: string | null = null
                      let newsHeadlineCount: number | null = null

                      const exitsForDate = row.recommended_date
                        ? strategyExitsByDate[row.recommended_date]
                        : null
                      const exitsList =
                        exitsForDate && Array.isArray(exitsForDate.exits)
                          ? exitsForDate.exits
                          : []

                      if (exitsList.length > 0) {
                        const matches = exitsList.filter(
                          (e: any) => e && e.symbol === row.symbol,
                        )
                        if (matches.length > 0) {
                          let best = matches[0]
                          for (let i = 1; i < matches.length; i++) {
                            const a = best as any
                            const b = matches[i] as any
                            const ta = Date.parse(a.generated_at || '') || 0
                            const tb = Date.parse(b.generated_at || '') || 0
                            if (tb > ta) best = b
                          }

                          const level = computeSentimentRiskLevel(
                            (best as any).news_risk_score,
                          )
                          if (level) {
                            newsRiskScore = level.score
                            newsRiskLabel = level.label
                            newsRiskColor = level.color
                          }

                          const reason = (best as any).news_reason
                          if (typeof reason === 'string' && reason.trim()) {
                            let s = reason.trim()
                            if (s.length > 120) s = s.slice(0, 117) + '...'
                            newsRiskSummary = s
                          }

                          const headlinesCount = (best as any).news_headlines_count
                          if (
                            typeof headlinesCount === 'number' &&
                            Number.isFinite(headlinesCount)
                          ) {
                            newsHeadlineCount = headlinesCount
                          }
                        }
                      }

                      const recStr = String(row.recommendation || '').toLowerCase()
                      const isShortSide = recStr.includes('sell')
                      const directionLabel = isShortSide ? 'Short' : 'Long'
                      const directionBg = isShortSide ? '#fee2e2' : '#dcfce7'
                      const directionColor = isShortSide ? '#991b1b' : '#166534'
                      const directionBorder = isShortSide
                        ? '#fecaca'
                        : '#bbf7d0'

                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: idx < 3 ? '#fefce8' : 'transparent',
                          }}
                        >
                          <td
                            style={{
                              padding: '10px 8px',
                              fontWeight: 600,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span>{row.symbol}</span>
                              {advisoryTooltipTitle && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: '#0f766e',
                                    cursor: 'default',
                                  }}
                                  title={advisoryTooltipTitle}
                                >
                                  !
                                </span>
                              )}
                              {newsRiskLabel && newsRiskScore != null && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: newsRiskColor,
                                    cursor: 'default',
                                  }}
                                  title={(() => {
                                    const parts: string[] = []
                                    parts.push(
                                      `${newsRiskLabel} (${Math.round(
                                        Number(newsRiskScore),
                                      )}/100)`,
                                    )
                                    if (newsRiskSummary) {
                                      parts.push(newsRiskSummary)
                                    }
                                    if (newsHeadlineCount != null) {
                                      parts.push(
                                        `${newsHeadlineCount} news item${newsHeadlineCount === 1 ? '' : 's'
                                        }`,
                                      )
                                    }
                                    return parts.join(' • ')
                                  })()}
                                >
                                  ★
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: '10px 8px',
                              fontSize: 11,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                              }}
                            >
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  background: '#f3e8ff',
                                  color: '#7c3aed',
                                  fontWeight: 600,
                                }}
                              >
                                {row.mode || 'Swing'}
                              </span>
                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 999,
                                  fontSize: 9,
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.4,
                                  background: directionBg,
                                  color: directionColor,
                                  border: `1px solid ${directionBorder}`,
                                  alignSelf: 'flex-start',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {directionLabel}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: '10px 8px',
                              fontSize: 12,
                              color: '#64748b',
                            }}
                          >
                            {(() => {
                              try {
                                const t = row.entry_time as any
                                if (!t) {
                                  return <div>{row.recommended_date}</div>
                                }

                                const d = new Date(t)
                                const dateLabel = formatIstDate(d)
                                const timeLabel = formatIstTime(d)

                                return (
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 2,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: '#64748b',
                                      }}
                                    >
                                      {dateLabel}
                                    </span>
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: '#0f172a',
                                      }}
                                    >
                                      {timeLabel}
                                    </span>
                                  </div>
                                )
                              } catch {
                                return <div>{row.recommended_date}</div>
                              }
                            })()}
                          </td>
                          <td
                            style={{
                              padding: '10px 8px',
                              textAlign: 'left',
                              fontSize: 12,
                              color: '#64748b',
                            }}
                          >
                            {(() => {
                              try {
                                const t = (row as any).exit_time
                                if (!t)
                                  return (
                                    <span
                                      style={{
                                        fontSize: 12,
                                        color: '#94a3b8',
                                      }}
                                    >
                                      —
                                    </span>
                                  )
                                const ts = new Date(t)
                                const open = 9 * 60 + 15
                                const close = 15 * 60 + 30

                                const istParts = (() => {
                                  try {
                                    const fmt = new Intl.DateTimeFormat('en-US', {
                                      timeZone: 'Asia/Kolkata',
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: false,
                                    })
                                    const parts = fmt.formatToParts(ts)
                                    const get = (type: string) => parts.find(p => p.type === type)?.value || ''
                                    const yyyy = get('year')
                                    const mm = get('month')
                                    const dd = get('day')
                                    const hh = parseInt(get('hour') || '0', 10)
                                    const mi = parseInt(get('minute') || '0', 10)
                                    return { yyyy, mm, dd, mins: hh * 60 + mi }
                                  } catch {
                                    return null
                                  }
                                })()

                                let displayTs = ts
                                if (istParts && istParts.yyyy && istParts.mm && istParts.dd) {
                                  const clampedMins = istParts.mins < open ? open : istParts.mins > close ? close : istParts.mins
                                  const hh = String(Math.floor(clampedMins / 60)).padStart(2, '0')
                                  const mi = String(clampedMins % 60).padStart(2, '0')
                                  displayTs = new Date(`${istParts.yyyy}-${istParts.mm}-${istParts.dd}T${hh}:${mi}:00+05:30`)
                                }

                                const dateLabel = formatIstDate(displayTs)
                                const timeLabel = formatIstTime(displayTs)
                                return (
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 2,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: '#64748b',
                                      }}
                                    >
                                      {dateLabel}
                                    </span>
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: '#0f172a',
                                      }}
                                    >
                                      {timeLabel}
                                    </span>
                                  </div>
                                )
                              } catch {
                                return (
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: '#94a3b8',
                                    }}
                                  >
                                    —
                                  </span>
                                )
                              }
                            })()}
                          </td>
                          <td
                            style={{
                              padding: '10px 8px',
                              textAlign: 'right',
                              fontSize: 13,
                            }}
                          >
                            ₹{row.entry_price}
                          </td>
                          <td
                            style={{
                              padding: '10px 8px',
                              textAlign: 'right',
                              fontSize: 13,
                            }}
                          >
                            {(() => {
                              const hasExit =
                                typeof row.exit_price === 'number' &&
                                Number.isFinite(row.exit_price)
                              const price = hasExit
                                ? row.exit_price
                                : row.current_price

                              if (
                                typeof price !== 'number' ||
                                !Number.isFinite(price)
                              ) {
                                return (
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: '#94a3b8',
                                    }}
                                  >
                                    —
                                  </span>
                                )
                              }

                              const label = hasExit
                                ? 'Exit price'
                                : 'Last traded price'

                              return (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                  }}
                                >
                                  <span>₹{price}</span>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: '#64748b',
                                      marginTop: 2,
                                    }}
                                  >
                                    {label}
                                  </span>
                                </div>
                              )
                            })()}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              padding: '10px 8px',
                              fontSize: 12,
                            }}
                          >
                            {(() => {
                              const baseRet =
                                typeof row.return_pct === 'number' &&
                                  Number.isFinite(row.return_pct)
                                  ? row.return_pct
                                  : 0
                              const baseColor =
                                baseRet > 0
                                  ? '#16a34a'
                                  : baseRet < 0
                                    ? '#ef4444'
                                    : '#64748b'

                              return (
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: baseColor,
                                  }}
                                >
                                  {baseRet > 0 ? '+' : ''}
                                  {baseRet.toFixed(2)}%
                                </span>
                              )
                            })()}
                          </td>
                          <td
                            style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              fontSize: 12,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: statusColor + '20',
                                  color: statusColor,
                                }}
                                title={statusDetail || undefined}
                              >
                                {row.status}
                              </span>
                              {statusDetail && (
                                <span
                                  style={{ fontSize: 10, color: '#64748b' }}
                                  title={statusDetail}
                                >
                                  {statusDetail}
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#64748b',
                            }}
                          >
                            {daysHeld}d
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
              {(() => {
                let recs = winningTradesData?.recommendations || []
                if (winningTradesMode !== 'All')
                  recs = recs.filter((r: any) => r.mode === winningTradesMode)
                if (winningTradesDate !== 'all')
                  recs = recs.filter(
                    (r: any) => r.recommended_date === winningTradesDate,
                  )
                if (recs.length === 0)
                  return (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: 40,
                        color: '#94a3b8',
                        fontSize: 14,
                      }}
                    >
                      📋 No trades found for selected filters
                    </div>
                  )
                return null
              })()}
            </div>

            {/* Mode Comparison Table */}
            {winningStrategiesData?.recommendations &&
              winningStrategiesData.recommendations.length > 0 && (
                <div
                  style={{
                    marginTop: 24,
                    background: '#fff',
                    borderRadius: 12,
                    padding: 16,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 16,
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>🔄</span>
                    <span>Mode Performance Comparison</span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      marginBottom: 6,
                    }}
                  >
                    Compare performance across all trading modes at a glance
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#94a3b8',
                      marginBottom: 16,
                    }}
                  >
                    {(() => {
                      try {
                        const lookbackDaysRaw = (winningStrategiesData as any)?.filters?.lookback_days
                        const lookbackDays =
                          typeof lookbackDaysRaw === 'number' && lookbackDaysRaw > 0
                            ? lookbackDaysRaw
                            : 7

                        const dates: string[] = Array.from(
                          new Set(
                            (winningStrategiesData?.recommendations || [])
                              .map((r: any) => r?.recommended_date)
                              .filter((d: any) => typeof d === 'string' && d),
                          ),
                        ) as string[]
                        dates.sort()

                        const start = typeof dates[0] === 'string' ? dates[0] : ''
                        const end = typeof dates[dates.length - 1] === 'string' ? dates[dates.length - 1] : ''

                        const fmt = (d: string) => {
                          try {
                            const dt = new Date(`${d}T00:00:00+05:30`)
                            const out = formatIstDate(dt)
                            return out || d
                          } catch {
                            return d
                          }
                        }

                        const range = start && end ? `${fmt(start)} – ${fmt(end)}` : ''

                        return `Timeframe: Last ${lookbackDays} days${range ? ` (${range})` : ''}`
                      } catch {
                        return 'Timeframe: Last 7 days'
                      }
                    })()}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: '8px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#64748b',
                          }}
                        >
                          Mode
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            padding: '8px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#64748b',
                          }}
                        >
                          Total Picks
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            padding: '8px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#64748b',
                          }}
                        >
                          Win Rate
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            padding: '8px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#64748b',
                          }}
                        >
                          Avg Return/Rec
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            padding: '8px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#64748b',
                          }}
                        >
                          Alpha vs NIFTY
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            padding: '8px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#64748b',
                          }}
                        >
                          Best Pick
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Scalping', 'Intraday', 'Swing', 'Options', 'Futures'].map(
                        (mode) => {
                          const modeRecs =
                            (winningStrategiesData?.recommendations || []).filter(
                              (r: any) => r.mode === mode,
                            )
                          if (modeRecs.length === 0) return null

                          const wins = modeRecs.filter(
                            (r: any) => r.return_pct > 0,
                          )
                          const winRate = (
                            (wins.length / modeRecs.length) * 100
                          ).toFixed(1)
                          const benchmark =
                            typeof winningStrategiesData?.metrics
                              ?.benchmark_return === 'number'
                              ? winningStrategiesData.metrics.benchmark_return
                              : 1.0

                          const avgRaw =
                            modeRecs.reduce((sum: number, r: any) => {
                              const v = r?.return_pct
                              if (typeof v === 'number' && !Number.isNaN(v)) return sum + v
                              const parsed = parseFloat(String(v))
                              return Number.isNaN(parsed) ? sum : sum + parsed
                            }, 0) / modeRecs.length

                          const avgNum = Object.is(avgRaw, -0) ? 0 : avgRaw
                          const alphaRaw = avgNum - benchmark
                          const alphaNum = Object.is(alphaRaw, -0) ? 0 : alphaRaw

                          const formatSignedPct = (v: number) => {
                            const rounded2 = Math.round(v * 100) / 100
                            if (Object.is(rounded2, -0) || Math.abs(rounded2) < 0.005) {
                              const abs = Math.abs(v)
                              if (abs >= 0.0005 && abs < 0.01) {
                                const mag = Math.round(abs * 1000) / 1000
                                return `${v > 0 ? '+' : '-'}${mag.toFixed(3)}%`
                              }
                              return '0.00%'
                            }
                            return `${rounded2 > 0 ? '+' : ''}${rounded2.toFixed(2)}%`
                          }

                          const avgDisplay = formatSignedPct(avgNum)
                          const alphaDisplay = formatSignedPct(alphaNum)
                          const bestPick = modeRecs.sort(
                            (a: any, b: any) => b.return_pct - a.return_pct,
                          )[0]

                          const modeColors: any = {
                            Scalping: {
                              bg: '#fce7f3',
                              border: '#fbcfe8',
                              text: '#831843',
                            },
                            Intraday: {
                              bg: '#fef3c7',
                              border: '#fde68a',
                              text: '#78350f',
                            },
                            Swing: {
                              bg: '#ede9fe',
                              border: '#ddd6fe',
                              text: '#4c1d95',
                            },
                            Options: {
                              bg: '#dbeafe',
                              border: '#bfdbfe',
                              text: '#1e40af',
                            },
                            Futures: {
                              bg: '#dcfce7',
                              border: '#bbf7d0',
                              text: '#166534',
                            },
                          }
                          const colors =
                            modeColors[mode] || {
                              bg: '#f1f5f9',
                              border: '#e2e8f0',
                              text: '#1e293b',
                            }

                          return (
                            <tr key={mode} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 8px' }}>
                                <span
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
                                    color: colors.text,
                                    fontSize: 11,
                                    fontWeight: 600,
                                  }}
                                >
                                  {mode}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: '10px 8px',
                                  textAlign: 'center',
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                {modeRecs.length}
                              </td>
                              <td
                                style={{
                                  padding: '10px 8px',
                                  textAlign: 'center',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: '#0f172a',
                                  }}
                                >
                                  {winRate}%
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: '10px 8px',
                                  textAlign: 'center',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: avgNum > 0 ? '#16a34a' : avgNum < 0 ? '#ef4444' : '#0f172a',
                                  }}
                                >
                                  {avgDisplay}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: '10px 8px',
                                  textAlign: 'center',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: alphaNum > 0 ? '#16a34a' : alphaNum < 0 ? '#ef4444' : '#0f172a',
                                  }}
                                >
                                  {alphaDisplay}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: '10px 8px',
                                  textAlign: 'center',
                                  fontSize: 11,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: '#1e293b',
                                    }}
                                  >
                                    {bestPick.symbol}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color:
                                        bestPick.return_pct >= 0
                                          ? '#16a34a'
                                          : '#ef4444',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {bestPick.return_pct >= 0 ? '+' : ''}
                                    {bestPick.return_pct}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )
                        },
                      )}
                    </tbody>
                  </table>

                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      background: '#fff7ed',
                      border: '1px solid #fed7aa',
                      borderRadius: 10,
                      color: '#1e293b',
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      How we track performance
                    </div>
                    <div style={{ color: '#475569' }}>
                      Each recommendation’s performance is tracked from the entry price suggested by our Trade Strategy Agent. Returns are calculated using the current market price (or exit price when closed). Status updates reflect when targets are hit or stop-losses are triggered.
                    </div>
                    <div style={{ marginTop: 10, color: '#0f172a', fontWeight: 600 }}>
                      Metric calculations
                    </div>
                    <div style={{ color: '#475569' }}>
                      <div>
                        <strong>Win Rate</strong> = (Number of recommendations with Return % &gt; 0) ÷ (Total recommendations) × 100
                      </div>
                      <div>
                        <strong>Average Return</strong> = (Sum of Return % across recommendations) ÷ (Total recommendations)
                      </div>
                      <div>
                        <strong>Alpha vs NIFTY</strong> = (Average Return %) − (NIFTY return % over the same lookback window)
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Chart View Modal */}
      {chartView && (
        <ChartView
          symbol={chartView.symbol}
          analysis={chartView.analysis}
          onClose={() => setChartView(null)}
          livePrice={livePrices[chartView.symbol]}
          onSubscribeSymbols={subscribeSymbols}
          onUnsubscribeSymbols={unsubscribeSymbols}
          accountId={accountProfile.account_id}
          sessionId={sessionId}
        />
      )}

      {/* Trading Preferences Modal */}
      <PreferencesModal
        prefsOpen={prefsOpen}
        setPrefsOpen={setPrefsOpen}
        risk={risk}
        setRisk={setRisk}
        primaryMode={primaryMode}
        setPrimaryMode={setPrimaryMode}
        availableModes={availableModes}
        updateMemory={updateMemory}
        showPicks={showPicks}
        onFetchPicks={onFetchPicks}
        reportError={reportError}
      />

      {/* Watchlist Modal */}
      <WatchlistModal
        showWatchlist={showWatchlist}
        isMobile={isMobile}
        watchlistMonitor={watchlistMonitor}
        loadingWatchlist={loadingWatchlist}
        loadingWatchlistEntriesAll={loadingWatchlistEntriesAll}
        watchlistEntriesAll={watchlistEntriesAll}
        watchlistShowAllEntries={watchlistShowAllEntries}
        watchlistExpanded={watchlistExpanded}
        watchlistMutatingId={watchlistMutatingId}
        watchlistTooltip={watchlistTooltip}
        livePrices={livePrices}
        closeWatchlist={() => setShowWatchlist(false)}
        fetchWatchlistMonitor={fetchWatchlistMonitor}
        fetchWatchlistEntriesAll={fetchWatchlistEntriesAll}
        setWatchlistShowAllEntries={setWatchlistShowAllEntries}
        setWatchlistExpanded={setWatchlistExpanded}
        mutateWatchlistStatus={mutateWatchlistStatus}
        setWatchlistTooltip={setWatchlistTooltip}
        setChartView={setChartView}
        setChartReturnTo={setChartReturnTo}
        setChatInput={setChatInput}
        watchlistDialogRef={watchlistDialogRef}
        watchlistCloseRef={watchlistCloseRef}
        watchlistScrollElRef={watchlistScrollElRef}
        swipeCloseWatchlist={swipeCloseWatchlist}
        arisChatSectionRef={arisChatSectionRef}
        watchlistScrollTopRef={watchlistScrollTopRef}
        watchlistRestoreScrollRef={watchlistRestoreScrollRef}
      />

      {/* Enhanced Styled Tooltip */}
      {tip && (() => {
        let x = tip.x
        let y = tip.y
        try {
          const vw = window.innerWidth || 0
          const vh = window.innerHeight || 0
          const margin = 16
          const approxHalfWidth = tip.type === 'mode' ? 130 : 110 // matches maxWidth ~260
          if (vw) {
            const minX = margin + approxHalfWidth
            const maxX = vw - margin - approxHalfWidth
            x = Math.min(Math.max(x, minX), maxX)
          }
          if (vh) {
            const minY = margin
            const maxY = vh - margin
            y = Math.min(Math.max(y, minY), maxY)
          }
        } catch { }

        const isChart = tip.type === 'chart'
        const isScore = tip.type === 'score'
        const isMode = tip.type === 'mode'

        return (
          <div style={{
            position: 'fixed',
            left: x,
            top: y,
            transform: 'translate(-50%, -100%)',
            background: isChart
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : isScore
                ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                : isMode
                  ? '#0f172a'
                  : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: isMode ? '#e5e7eb' : '#fff',
            padding: isMode ? '10px 14px' : '8px 14px',
            borderRadius: 8,
            fontSize: isMode ? 11 : 12,
            fontWeight: 600,
            whiteSpace: isMode ? 'normal' : 'nowrap',
            maxWidth: isMode ? 260 : undefined,
            lineHeight: isMode ? 1.4 : 1.2,
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 8px 20px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)',
            border: '2px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(8px)',
            animation: 'tooltipFadeIn 0.2s ease-out'
          }}>
            {tip.text}
            {/* Tooltip Arrow */}
            <div style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: isChart
                ? '6px solid #764ba2'
                : isScore
                  ? '6px solid #f5576c'
                  : isMode
                    ? '6px solid #0f172a'
                    : '6px solid #00f2fe'
            }} />
          </div>
        )
      })()}

      {/* ProactiveChat removed - using single ARIS chat interface only */}

      {/* Scalping Monitor */}
      {showScalpingMonitor && (
        <ScalpingMonitor
          onClose={() => setShowScalpingMonitor(false)}
          livePrices={livePrices}
          onSubscribeSymbols={subscribeSymbols}
          onUnsubscribeSymbols={unsubscribeSymbols}
          refreshToken={scalpingMonitorRefreshToken}
        />
      )}

      {/* Exit Notifications */}
      <ExitNotificationManager wsExits={scalpingWsExits} />

      {/* About Menu Modal */}
      {isAboutMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
          onClick={() => setIsAboutMenuOpen(false)}
        >
          <div
            style={{
              width: 'min(320px, 90vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#1e293b', marginBottom: 4 }}>ℹ️ About</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Fyntrix Trading Platform</div>
              </div>
              <button
                onClick={() => setIsAboutMenuOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 28,
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => {
                  setIsAboutMenuOpen(false)
                  setShowCompany(true)
                }}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f9fafb'
                  e.currentTarget.style.borderColor = '#3b82f6'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fff'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }}
              >
                <BriefcaseBusiness size={18} color="#1e293b" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Company</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Learn about our company</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsAboutMenuOpen(false)
                  setShowProducts(true)
                }}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f9fafb'
                  e.currentTarget.style.borderColor = '#3b82f6'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fff'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }}
              >
                <LayoutGrid size={18} color="#1e293b" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Products</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Explore our features</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsAboutMenuOpen(false)
                  setShowDisclosure(true)
                }}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f9fafb'
                  e.currentTarget.style.borderColor = '#3b82f6'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fff'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }}
              >
                <Copy size={18} color="#1e293b" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Disclosure</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>View terms and disclaimer</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle FYNTRIX watermark */}
      <div
        style={{
          position: 'fixed',
          right: 6,
          bottom: 4,
          fontSize: 9,
          color: '#9ca3af',
          opacity: 0.45,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <FyntrixLogo />
        <span>· Licensed to {BRANDING.licensee}</span>
      </div>

      <SupportChatModal
        isOpen={isSupportChatOpen}
        onClose={() => setIsSupportChatOpen(false)}
        sessionId={sessionId}
        accountName={accountProfile.name}
        accountId={accountProfile.account_id}
      />

      {showCompany && (
        <div
          onClick={() => setShowCompany(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1500,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 720,
              maxWidth: '92vw',
              maxHeight: '86vh',
              overflow: 'hidden',
              borderRadius: 16,
              background: '#fff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>Company</div>
              <button
                onClick={() => setShowCompany(false)}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', background: '#fff' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{BRANDING.appName}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                <div><span style={{ fontWeight: 700 }}>Owner:</span> {BRANDING.owner}</div>
                <div><span style={{ fontWeight: 700 }}>Licensee:</span> {BRANDING.licensee}</div>
                <div><span style={{ fontWeight: 700 }}>App ID:</span> {BRANDING.appId}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProducts && (
        <div
          onClick={() => setShowProducts(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1500,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 720,
              maxWidth: '92vw',
              maxHeight: '86vh',
              overflow: 'hidden',
              borderRadius: 16,
              background: '#fff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>Products</div>
              <button
                onClick={() => setShowProducts(false)}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', background: '#fff' }}>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Core modules</div>
                <div style={{ marginTop: 10 }}>- Market Brief + News</div>
                <div>- Top Picks (Scalping / Intraday / Swing / Options / Futures)</div>
                <div>- Top Picks Map</div>
                <div>- Portfolio + Watchlist monitors</div>
                <div>- AI Research and Trade Strategist chat</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDisclosure && (
        <div
          onClick={() => {
            if (disclosureAccepted) setShowDisclosure(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1600,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 920,
              maxWidth: '94vw',
              maxHeight: '88vh',
              overflow: 'hidden',
              borderRadius: 16,
              background: '#fff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Disclosure & Disclaimer</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Trading assisted by AI agents; not investment advice.</div>
              </div>
              <button
                onClick={() => {
                  if (disclosureAccepted) setShowDisclosure(false)
                }}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  cursor: disclosureAccepted ? 'pointer' : 'not-allowed',
                  fontWeight: 800,
                  opacity: disclosureAccepted ? 1 : 0.6,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', background: '#fff' }}>
              <div style={{ fontSize: 12.5, color: '#0f172a', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {(String(BRANDING.owner || '').toLowerCase().includes('tradesurf') ? TRADESURF_DISCLOSURE_TEXT : DISCLOSURE_TEXT).trim()}
              </div>
            </div>
            <div style={{ padding: 14, borderTop: '1px solid #e5e7eb', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => {
                  try {
                    localStorage.setItem('arise_disclosure_accepted_v1', '1')
                  } catch { }
                  setDisclosureAccepted(true)
                  setShowDisclosure(false)
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #1d4ed8',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: 13,
                  opacity: 1,
                }}
              >
                I Understand and Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {showAgents && (
        <div
          onClick={() => setShowAgents(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1500,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 860,
              maxWidth: '94vw',
              maxHeight: '86vh',
              overflow: 'hidden',
              borderRadius: 16,
              background: '#fff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Trading assisted by AI agents</div>
                <div style={{ fontSize: 12, opacity: 0.92 }}>How picks are generated and how to use them responsibly.</div>
              </div>
              <button
                onClick={() => setShowAgents(false)}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', background: '#fff' }}>
              <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>Agent system (13-agent architecture)</div>
                <div style={{ color: '#334155', marginBottom: 14 }}>
                  Top Picks are generated using multiple specialist AI agents. Each agent focuses on a distinct market dimension. The final score is a weighted blend of scoring agents, plus utility agents that add strategy, monitoring, and personalization context.
                </div>

                <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>Core scoring agents</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800 }}>Technical Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Trend, momentum, support/resistance, and multi-timeframe signals.</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800 }}>Pattern Recognition Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Chart patterns (breakouts, reversals), structure quality, and confirmation checks.</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800 }}>Global Market Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Cross-market cues (global indices, risk-on/off), correlation context.</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800 }}>Policy & Macro Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Macro regime, policy events, and potential headline/event risk influence.</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800 }}>Options Flow Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Options positioning/flow cues and volatility-aware confirmation (where applicable).</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800 }}>Sentiment Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Market mood and sentiment signals to avoid crowded/fragile setups.</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800 }}>Microstructure Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Liquidity, execution quality signals, and price action behavior checks.</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800 }}>Risk Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Downside checks, stop/invalidations, and risk alignment for the selected mode.</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800 }}>Market Regime Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Detects regime shifts (trend vs mean-reversion) to tune signal interpretation.</div>
                  </div>
                </div>

                <div style={{ fontWeight: 900, fontSize: 13, marginTop: 14, marginBottom: 8 }}>Utility agents (context + execution discipline)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#ffffff' }}>
                    <div style={{ fontWeight: 800 }}>Trade Strategy Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Translates the blended signals into an actionable plan (entry/targets/invalidations).</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#ffffff' }}>
                    <div style={{ fontWeight: 800 }}>Watchlist Intelligence Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Highlights watchlist-specific moves and context; monitoring-first.</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#ffffff' }}>
                    <div style={{ fontWeight: 800 }}>Auto-Monitoring Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Monitors follow-through conditions and can trigger alerts/exit cues.</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#ffffff' }}>
                    <div style={{ fontWeight: 800 }}>Personalization Agent</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Adapts output formatting and guardrails to your mode/risk preferences.</div>
                  </div>
                </div>

                <div style={{ fontWeight: 900, fontSize: 13, marginTop: 14, marginBottom: 8 }}>Important (trust + compliance)</div>
                <div style={{ color: '#334155' }}>
                  This is decision support, not a guarantee. Always validate liquidity, risk, and position sizing. You should read and accept the Disclosure before acting.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAccountOpen && (
        <div
          onClick={() => setIsAccountOpen(false)}
          role="dialog"
          aria-modal={true}
          aria-label="Account"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            ref={accountDialogRef}
            tabIndex={-1}
            style={{
              width: 520,
              maxWidth: '92vw',
              borderRadius: 16,
              overflow: 'hidden',
              background: '#fff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 16 }}>Account</div>
              <button
                ref={accountCloseRef}
                onClick={() => setIsAccountOpen(false)}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  width: isMobile ? 44 : 34,
                  height: isMobile ? 44 : 34,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 16 }}>
              {/* User Info Section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
                  User Information
                </div>

                {(() => {
                  const userData = getUserData()
                  if (!userData) {
                    return (
                      <div style={{
                        padding: 12,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: 12, color: '#dc2626' }}>
                          No user data found
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div style={{
                      display: 'grid',
                      gap: 12,
                      background: '#f8fafc',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={16} color="#64748b" />
                        <div>
                          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Name
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                            {userData.name || 'Not provided'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {userData.email ? <Mail size={16} color="#64748b" /> : <Phone size={16} color="#64748b" />}
                        <div>
                          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {userData.email ? 'Email' : 'Phone'}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                            {userData.email || userData.phone}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Account Profile Section (Legacy)
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                  This is a temporary placeholder until IAM is wired. The Support chat greeting will use this name.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  <input
                    value={accountProfile.name}
                    onChange={e => setAccountProfile(p => ({ ...p, name: e.target.value }))}
                    placeholder="Account name (e.g., ABC)"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      fontSize: 14,
                      background: '#fff',
                    }}
                  />
                  <input
                    value={accountProfile.account_id}
                    onChange={e => setAccountProfile(p => ({ ...p, account_id: e.target.value }))}
                    placeholder="Account ID (optional)"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      fontSize: 14,
                      background: '#fff',
                    }}
                  />
                </div>
              </div> */}

              {/* Action Buttons */}
              {/* <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  onClick={() => setIsAccountOpen(false)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem('arise_account_profile_v1', JSON.stringify(accountProfile))
                    } catch {}
                    setIsAccountOpen(false)
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #1d4ed8',
                    background: '#1d4ed8',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  Save
                </button>
              </div> */}

              {/* Logout Button */}
              <div style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around'
              }}>
                <button
                  onClick={() => setIsAccountOpen(true)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 10,
                    background: '#1d4ed8',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  Edit Account Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onLogout={() => {
          setIsAccountOpen(false)
          window.location.href = '/login'
        }}
      />

      {isMobile && (
        <div
          className="safe-area-bottom"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#ffffff',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            padding: '2px 0',
            zIndex: 100,
          }}
        >
          <button
            onClick={() => {
              setActiveMobileTab('portfolio')
              setShowPortfolio(true)
              setShowWatchlist(false)
              setShowPicks(false)
              setShowHeatMap(false)
            }}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '10px 0',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BriefcaseBusiness size={18} color={activeMobileTab === 'portfolio' ? '#1d4ed8' : '#0f172a'} />
            </div>
            <span style={{ fontSize: 11, fontWeight: activeMobileTab === 'portfolio' ? 900 : 700, color: activeMobileTab === 'portfolio' ? '#1d4ed8' : '#0f172a' }}>Portfolio</span>
          </button>

          <button
            onClick={() => {
              setActiveMobileTab('watchlist')
              setShowWatchlist(true)
              setShowPortfolio(false)
              setShowPicks(false)
              setShowHeatMap(false)
            }}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '10px 0',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image size={18} color={activeMobileTab === 'watchlist' ? '#1d4ed8' : '#0f172a'} />
            </div>
            <span style={{ fontSize: 11, fontWeight: activeMobileTab === 'watchlist' ? 900 : 700, color: activeMobileTab === 'watchlist' ? '#1d4ed8' : '#0f172a' }}>Watchlist</span>
          </button>

          <button
            onClick={() => {
              setActiveMobileTab('home')
              setShowPortfolio(false)
              setShowWatchlist(false)
              setShowPicks(false)
              setShowHeatMap(true)
            }}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '10px 0',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutGrid size={18} color={activeMobileTab === 'home' ? '#1d4ed8' : '#0f172a'} />
            </div>
            <span style={{ fontSize: 11, fontWeight: activeMobileTab === 'home' ? 900 : 700, color: activeMobileTab === 'home' ? '#1d4ed8' : '#0f172a' }}>Home</span>
          </button>

          <button
            onClick={() => {
              setActiveMobileTab('winners')
              setShowWinningTrades(true)
            }}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '10px 0',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={18} color={activeMobileTab === 'winners' ? '#1d4ed8' : '#0f172a'} />
              {winnersIsLive && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: '#16a34a',
                    boxShadow: '0 0 0 2px #f5faff',
                  }}
                />
              )}
            </div>
            <span style={{ fontSize: 11, fontWeight: activeMobileTab === 'winners' ? 900 : 700, color: activeMobileTab === 'winners' ? '#1d4ed8' : '#0f172a' }}>Winners</span>
          </button>

          <button
            onClick={() => {
              setActiveMobileTab('more')
              setIsMoreOpen(true)
            }}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '10px 0',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Menu size={18} color={activeMobileTab === 'more' ? '#1d4ed8' : '#0f172a'} />
            </div>
            <span style={{ fontSize: 11, fontWeight: activeMobileTab === 'more' ? 900 : 700, color: activeMobileTab === 'more' ? '#1d4ed8' : '#0f172a' }}>More</span>
          </button>
        </div>
      )}
    </div>
  )
}
