import React, { useEffect, useMemo, useState, Fragment, useRef } from 'react'
import { getFlows, getMarketSummary, getNews, getMiniSeries, postChat, getAgentsPicks, postStrategySuggest, getWinningTrades, getTradingModes, validateTradingModes, logPickInteraction, logPickFeedback, updateMemory, getPortfolioMonitor, addWatchlistEntry, postAnalyze, getStrategyExits, getRlMetrics } from './api'
import { BRANDING } from './branding'
import { FyntrixLogo } from './components/FyntrixLogo'
import { computeSentimentRiskLevel } from './sentimentRisk'
import { LayoutGrid, SlidersHorizontal, BriefcaseBusiness, Image, SquareActivity, Trophy, Copy, Bell, MessageCircle, Megaphone, User, Globe } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ChartView } from './components/ChartView'
import { MarketHeatMap } from './components/MarketHeatMap'
import { AgentConsensus } from './components/AgentConsensus'
import { InsightCards } from './components/InsightCards'
import { ScalpingMonitor } from './components/ScalpingMonitor'
import { ExitNotificationManager } from './components/ExitNotification'
import { TradeStrategyPanel } from './components/TradeStrategyPanel'
import type { Pick as AIPick } from './types/picks'
import { classifyPickDirection, type PickDirection } from './utils/recommendation'
// ProactiveChat removed - using single ARIS chat interface only

// Score-based color utility function
const getScoreColor = (score: number) => {
  if (score < 30) return '#ef4444'  // RED
  if (score < 50) return '#f97316'  // ORANGE
  if (score < 70) return '#3b82f6'  // BLUE
  return '#16a34a'  // GREEN
}

const isFallbackPick = (p: any) => {
  if (!p) return false
  const rationale = typeof p.rationale === 'string' ? p.rationale : ''
  const keyFindings = typeof p.key_findings === 'string' ? p.key_findings : ''
  return rationale.startsWith('Fallback:') || keyFindings.startsWith('Fallback:')
}

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

export default function App(){
  try { dayjs.extend(relativeTime) } catch {}
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
  const [tip, setTip] = useState<{x:number,y:number,text:string,type?:string}|null>(null)
  const [tipTimer, setTipTimer] = useState<any>(null)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showWatchlist, setShowWatchlist] = useState(false)
  const [showAgents, setShowAgents] = useState(false)
  const [disclosureAccepted, setDisclosureAccepted] = useState<boolean>(()=>{
    try {
      return localStorage.getItem('arise_disclosure_accepted_v1') === '1'
    } catch {
      return false
    }
  })
  const [showDisclosure, setShowDisclosure] = useState<boolean>(()=>{
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
  const [rlMetricsData, setRlMetricsData] = useState<any|null>(null)
  const [rlDailyData, setRlDailyData] = useState<any[]|null>(null)
  const [loadingRlMetrics, setLoadingRlMetrics] = useState(false)
  const [rlMetricsError, setRlMetricsError] = useState<string|null>(null)
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
  const [portfolioMonitor, setPortfolioMonitor] = useState<any|null>(null)
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)
  const [watchlistMonitor, setWatchlistMonitor] = useState<any|null>(null)
  const [loadingWatchlist, setLoadingWatchlist] = useState(false)
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
  const [explainPick, setExplainPick] = useState<string|null>(null) // Symbol to show explanation for
  const [chartView, setChartView] = useState<{symbol: string, analysis?: AIPick} | null>(null) // Chart view state
  const [universe, setUniverse] = useState<string>(()=>{
    try { return localStorage.getItem('arise_universe') || 'NIFTY50' } catch { return 'NIFTY50' }
  })
  const [marketRegion, setMarketRegion] = useState<'India'|'Global'>(()=>{
    try { return (localStorage.getItem('arise_market_region') as any) || 'India' } catch { return 'India' }
  })

  // Trade preferences
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [risk, setRisk] = useState<'Aggressive'|'Moderate'|'Conservative'>(()=>{
    try { return (localStorage.getItem('arise_risk') as any)||'Moderate' } catch { return 'Moderate' }
  })
  const [modes, setModes] = useState<Record<string, boolean>>(()=>{
    try {
      const stored = JSON.parse(localStorage.getItem('arise_modes')||'null') as any
      if (stored) {
        if (stored.Delivery && stored.Swing == null) {
          stored.Swing = stored.Delivery
        }
        delete stored.Delivery
        return stored
      }
      return { Intraday:true, Swing:true, Options:false, Futures:false, Commodity:false }
    } catch {
      return { Intraday:true, Swing:true, Options:false, Futures:false, Commodity:false }
    }
  })

  // NEW: Primary trading mode system
  const [availableModes, setAvailableModes] = useState<any[]>([])
  const [primaryMode, setPrimaryMode] = useState<string>(()=>{
    try {
      const stored = localStorage.getItem('arise_primary_mode')
      if (!stored) return 'Swing'
      if (stored === 'Delivery' || stored === 'Positional') return 'Swing'
      return stored
    } catch { return 'Swing' }
  })
  const [auxiliaryModes, setAuxiliaryModes] = useState<string[]>(()=>{
    try { return JSON.parse(localStorage.getItem('arise_auxiliary_modes')||'[]') } catch { return [] }
  })
  const [picksData, setPicksData] = useState<any>(null) // Full picks response with mode info
  const [picksSystemMessage, setPicksSystemMessage] = useState<string>('')

  // NEW: State for advanced UI components
  const [showHeatMap, setShowHeatMap] = useState(true) // Show heat map by default
  const [insights, setInsights] = useState<any[]>([]) // Smart insight cards
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

  useEffect(()=>{ document.body.style.background='#ffffff'; document.body.style.color='#0b0f14' }, [])

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

  // Load trading modes on mount
  useEffect(()=>{
    (async()=>{
      try {
        const data = await getTradingModes()
        setAvailableModes(data.modes || [])
      } catch (err) {
        console.error('Failed to load trading modes:', err)
      }
    })()
  }, [])

  // Global listeners: hide tooltip on scroll; ESC closes drawers/modals and tooltip; keyboard shortcuts
  useEffect(()=>{
    const onScroll = ()=> setTip(null)
    const onKey = (e: KeyboardEvent)=>{
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      
      if (e.key === 'Escape'){
        setPrefsOpen(false); setShowPortfolio(false); setShowWatchlist(false); setShowAgents(false); setShowPicks(false); setAnalyze(null); setTip(null); setChartView(null); setShowScalpingMonitor(false);
        if (disclosureAccepted) setShowDisclosure(false)
      }
      // P = Toggle Picks drawer
      else if (e.key === 'p' || e.key === 'P'){
        if (picks.length > 0) setShowPicks(s=>!s)
        else onFetchPicks()
      }
      // / = Focus Fyntrix chat
      else if (e.key === '/'){
        e.preventDefault()
        const input = document.querySelector('input[placeholder="Ask Fyntrix…"]') as HTMLInputElement
        if (input) input.focus()
      }
      // I = Toggle Intraday mode
      else if (e.key === 'i' || e.key === 'I'){
        setModes(m=>{ const updated = {...m, Intraday: !m.Intraday}; try{localStorage.setItem('arise_modes', JSON.stringify(updated))}catch{}; return updated })
      }
      // D = Toggle Swing mode (legacy: Delivery)
      else if (e.key === 'd' || e.key === 'D'){
        setModes(m=>{
          const current = m.Swing ?? m.Delivery ?? true
          const updated: any = { ...m, Swing: !current }
          delete updated.Delivery
          try{localStorage.setItem('arise_modes', JSON.stringify(updated))}catch{}
          return updated
        })
      }
      // O = Toggle Options mode
      else if (e.key === 'o' || e.key === 'O'){
        setModes(m=>{ const updated = {...m, Options: !m.Options}; try{localStorage.setItem('arise_modes', JSON.stringify(updated))}catch{}; return updated })
      }
      // F = Toggle Futures mode
      else if (e.key === 'f' || e.key === 'F'){
        setModes(m=>{ const updated = {...m, Futures: !m.Futures}; try{localStorage.setItem('arise_modes', JSON.stringify(updated))}catch{}; return updated })
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKey)
    return ()=>{
      window.removeEventListener('scroll', onScroll as any)
      window.removeEventListener('keydown', onKey)
    }
  }, [picks, disclosureAccepted])

  // Realtime WebSocket connection for streaming updates (top picks, market brief, flows, ticks)
  useEffect(()=>{
    let reconnectTimer: any = null

    const connect = () => {
      try {
        const base =
          import.meta.env.PROD && (import.meta.env.VITE_API_BASE_URL as string | undefined)
            ? (import.meta.env.VITE_API_BASE_URL as string)
            : window.location.origin
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
            console.error('[WS] Resubscribe error', err)
          }
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
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
                } catch {}
              }
            } else if (type === 'market_summary_update') {
              // Live Market Brief updates
              if (!msg.region || msg.region === marketRegion) {
                if (msg.payload) setMarket(msg.payload)
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
            console.error('[WS] Message parse error', err)
          }
        }

        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 5000)
        }

        ws.onerror = () => {
          try { ws && ws.close() } catch {}
        }
      } catch (err) {
        console.error('[WS] Connection error', err)
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
      console.error('[WS] Subscribe error', err)
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
      console.error('Failed to load watchlist monitor data:', e)
      setWatchlistMonitor(null)
    } finally {
      setLoadingWatchlist(false)
    }
  }, [])

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
      console.error('[WS] Unsubscribe error', err)
    }
  }, [])

  const sessionId = useMemo(()=>{
    try { return localStorage.getItem('arise_session') || (()=>{ const id = Math.random().toString(36).slice(2); localStorage.setItem('arise_session', id); return id })() } catch { return 'local' }
  }, [])

  const isIndiaMarketOpen = useMemo(() => {
    try {
      const now = new Date()
      const day = now.getDay() // 0=Sun, 6=Sat
      const isWeekday = day >= 1 && day <= 5

      const hours = now.getHours()
      const minutes = now.getMinutes()
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
      const today = new Date()
      return asOfDate.toDateString() !== today.toDateString()
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

    const isScalpingMode = primaryMode === 'Scalping'

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

      const allFallbackCached = isScalpingMode && cachedItems.length > 0 && cachedItems.every(isFallbackPick)

      // If mode changed vs cache, force refresh only when market is open
      if (!sameMode) {
        console.log(`Mode mismatch: cached=${cached.primary_mode}, current=${primaryMode}. Forcing refresh.`)
        if (isIndiaMarketOpen) {
          needsRefresh = true
        }
      }

      // Safe to show cached instantly only if universe+mode match and we're not on a Scalping fallback snapshot
      canUseCached = sameUniverse && sameMode && !allFallbackCached

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
        } catch {}
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
      const allFallbackFresh = isScalpingMode && items.length > 0 && items.every(isFallbackPick)

      if (items.length === 0) {
        // No fresh picks from backend. If we already have a cached snapshot for this
        // universe/mode, keep showing it and clearly label that it is from the last
        // trading session instead of leaving the panel empty.
        const hasCachedItems =
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
            'Agents did not return any actionable ' +
              primaryMode +
              ' setups for ' +
              universe.toUpperCase() +
              ' in the latest run. Try again during market hours or switch universe/mode for more ideas.',
          )
        }
        // Do not cache an empty response as a valid snapshot.
        return
      }

      if (allFallbackFresh) {
        // Treat deterministic fallback Scalping picks as "no actionable setups" for the UI
        setPicks([])
        setPicksAsOf(r?.as_of || '')
        setPicksData(r)
        setPicksSystemMessage(
          'Agents did not find any actionable Scalping setups for this universe in the last run. Try again during market hours or switch to Intraday/Swing for more ideas.',
        )
        // Do NOT cache these fallback picks to avoid showing them as real recommendations later
      } else {
        setPicks(items)
        setPicksAsOf(r?.as_of || '')
        setPicksData(r) // Store full response including mode_info
        try {
          localStorage.setItem(
            'arise_picks',
            JSON.stringify({ items, as_of: r?.as_of || '', universe, primary_mode: primaryMode, picksData: r }),
          )
        } catch {}
      }
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

    ;(async () => {
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

        if (cached && cached.items && cached.universe === universe && cached.primary_mode === primaryMode) {
          if (!cancelled) {
            const cachedItems: AIPick[] = Array.isArray(cached.items) ? cached.items : []
            setPicks(cachedItems as AIPick[])
            setPicksAsOf(cached.as_of || '')
            setPicksData(cached.picksData)
          }
          return
        }

        const r = await getAgentsPicks({
          limit: 10,
          universe,
          session_id: sessionId,
          refresh: false,
          primary_mode: primaryMode,
        })

        if (cancelled) return

        const items: AIPick[] = Array.isArray(r?.items) ? (r.items as AIPick[]) : []
        const isScalpingMode = primaryMode === 'Scalping'
        const allFallback = isScalpingMode && items.length > 0 && items.every(isFallbackPick)

        if (allFallback) {
          return
        }

        setPicks(items)
        setPicksAsOf(r?.as_of || '')
        setPicksData(r)
        try {
          localStorage.setItem(
            'arise_picks',
            JSON.stringify({ items, as_of: r?.as_of || '', universe, primary_mode: primaryMode, picksData: r }),
          )
        } catch {}
      } catch (e) {
        console.error('Prefetch top picks failed:', e)
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
      console.error('Failed to load portfolio monitor data:', e)
      setPortfolioMonitor(null)
    } finally {
      setLoadingPortfolio(false)
    }
  }, [])

  // Auto-refresh picks when primary mode changes (if picks drawer is open)
  useEffect(()=>{
    if (showPicks && picks.length > 0) {
      onFetchPicks(true) // Force refresh when mode changes
    }
  }, [primaryMode, showPicks, onFetchPicks])

  useEffect(() => {
    if (!Array.isArray(picks) || picks.length === 0) return

    ensureStrategyCacheLoaded()

    const top = picks.slice(0, 3)

    ;(async () => {
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
            recommendation: baseRecommendation,
            agents: Array.isArray(row.agents) ? row.agents : undefined,
          }

          strategyCacheRef.current[cacheKey] = entry
          updatedKeys.push(cacheKey)
        } catch {
          // Ignore prefetch errors to keep UI responsive
        }
      }

      if (updatedKeys.length) {
        persistStrategyCache()
      }
    })()
  }, [picks, primaryMode, risk, picksAsOf, sessionId, modes])

  // Generate insights when picks change (purely factual, no auto market outlook)
  useEffect(()=>{
    if (picks.length > 0) {
      const newInsights: any[] = []
      
      // Opportunity insights for top scoring picks
      const topPicks = picks.filter(p => p.score_blend >= 70)
      if (topPicks.length > 0) {
        newInsights.push({
          id: `opp-${Date.now()}`,
          type: 'opportunity',
          title: `${topPicks.length} High-Confidence Pick${topPicks.length > 1 ? 's' : ''}`,
          message: `${topPicks.map(p => p.symbol).join(', ')} showing strong signals (70%+ score)`,
          actionable: true,
          metadata: { symbols: topPicks.map(p => p.symbol), avgScore: topPicks.reduce((a,p) => a + p.score_blend, 0) / topPicks.length }
        })
      }

      setInsights(newInsights.slice(0, 3)) // Max 3 insights
    }
  }, [picks])

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
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      if (winningTradesData) return
      ;(async () => {
        try {
          const data = await getWinningTrades({ lookback_days: 7, universe: universe.toLowerCase() })
          if (!cancelled) {
            setWinningTradesData(data)
            try {
              localStorage.setItem('arise_winning_trades', JSON.stringify(data))
            } catch {}
          }
        } catch (e) {
          console.error('Prefetch winning trades failed:', e)
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

    ;(async () => {
      const missing = dates.filter(d => !strategyExitsByDate[d])
      if (missing.length === 0) return

      for (const d of missing) {
        try {
          const data = await getStrategyExits({ date: d, strategy_id: 'NEWS_EXIT' })
          setStrategyExitsByDate(prev => ({ ...prev, [d]: data }))
        } catch (e) {
          console.error('Failed to load strategy exits for date', d, e)
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

  const onAnalyze = React.useCallback(async (row:any) => {
    ensureStrategyCacheLoaded()

    const score = typeof row.score_blend === 'number' ? row.score_blend : 0
    const dir = classifyPickDirection(score, primaryMode)
    const derivedFromScore = dir?.label || (score >= 80 ? 'Strong Buy' : score >= 60 ? 'Buy' : 'Sell')
    const baseRecommendation =
      row.recommendation && ['Strong Buy', 'Buy', 'Sell', 'Strong Sell'].includes(row.recommendation)
        ? row.recommendation
        : derivedFromScore

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
        recommendation: cached.recommendation || baseRecommendation,
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
      recommendation: baseRecommendation,
      agents,
    })

    try {
      const recommendation = baseRecommendation
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
        } catch {
          // Non-fatal: strategy plan still available even if /v1/analyze fails
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
    } catch {
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

  const onAskFromPick = (row:any) => {
    const text = `Analyze ${row.symbol} and suggest a trading strategy. Agent blend score: ${row.score_blend}%.`
    setChat(c=>[...c, { role:'user', text }])
  }


  // Fetch market data when region changes
  useEffect(()=>{ (async()=>{
    try {
      const [m, f] = await Promise.all([getMarketSummary(marketRegion), getFlows()])
      console.log('Market data:', m)
      console.log('Flows data:', f)
      setMarket(m)
      setFlows(f)
      const ts = new Date().toLocaleTimeString()
      setAsOf(ts)
      try {
        localStorage.setItem('arise_market', JSON.stringify(m))
        localStorage.setItem('arise_flows', JSON.stringify(f))
        localStorage.setItem('arise_market_asof', ts)
      } catch {}
    } catch (err) {
      console.error('Failed to fetch market/flows:', err)
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
      } catch {}
    }
  })() }, [marketRegion])

  // Fetch sparklines based on region
  useEffect(()=>{ (async()=>{
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
      } catch {}
    } catch (err) { 
      console.error('Failed to fetch sparklines:', err)
      try {
        const raw = localStorage.getItem('arise_spark')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') {
            setSpark(parsed)
            return
          }
        }
      } catch {}
      setSpark({}) 
    }
  })() }, [marketRegion])

  useEffect(()=>{ 
    let timer: any

    const fetchNews = async () => {
      try {
        const r = await getNews({ category: 'general', limit: 20 })
        const items = Array.isArray(r?.items)? r.items: []
        // Separate events (corporate actions, earnings, announcements) from general news
        const evts = items.filter((n:any)=> {
          const title = String(n.title||'').toLowerCase()
          const desc = String(n.description||'').toLowerCase()
          return title.includes('announcement') || title.includes('filing') || 
                 title.includes('corporate action') || title.includes('agm') || 
                 desc.includes('corporate filing') || desc.includes('event calendar')
        })
        const newsItems = items // Show all items in news, not filtering
        setEvents(evts.length > 0 ? evts : items.slice(0, 3)) // Fallback to first 3 items if no events
        setEventsAsOf(r?.as_of||'')
        setNews(newsItems)
        setNewsAsOf(r?.as_of||'')
        try {
          localStorage.setItem('arise_news', JSON.stringify({
            items: newsItems,
            as_of: r?.as_of || '',
          }))
        } catch {}
      } catch {
        // On failure, fall back to cached news if available
        try {
          const raw = localStorage.getItem('arise_news')
          if (raw) {
            const parsed = JSON.parse(raw)
            const items = Array.isArray(parsed?.items) ? parsed.items : (Array.isArray(parsed) ? parsed : [])
            const evts = items.filter((n:any)=> {
              const title = String(n.title||'').toLowerCase()
              const desc = String(n.description||'').toLowerCase()
              return title.includes('announcement') || title.includes('filing') || 
                     title.includes('corporate action') || title.includes('agm') || 
                     desc.includes('corporate filing') || desc.includes('event calendar')
            })
            const newsItems = items
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

  const tiles = useMemo(()=>{
    const t: Array<{name:string,val:string,pct?:number,accent:string}> = []
    try {
      const indices = market?.indices||[]
      
      if (marketRegion === 'India') {
        const nf = indices.find((x:any)=> (x.name||'').toLowerCase().includes('nifty 50') || (x.name||'').toLowerCase() === 'nifty')
        const bn = indices.find((x:any)=> (x.name||'').toLowerCase().includes('bank'))
        const gold = indices.find((x:any)=> (x.name||'').toLowerCase().includes('gold'))
        
        if (nf) t.push({ name:'NIFTY', val: String(Number(nf.price||0).toFixed(2)), pct:Number(nf.chg_pct||0), accent:'#1d4ed8' })
        if (bn) t.push({ name:'BANKNIFTY', val: String(Number(bn.price||0).toFixed(2)), pct:Number(bn.chg_pct||0), accent:'#7c3aed' })
        
        // Try to get GOLD from indices first, then from spark
        if (gold && gold.price) {
          t.push({ name:'GOLD', val: String(Number(gold.price).toFixed(2)), pct:Number(gold.chg_pct||0), accent:'#f59e0b' })
        } else {
          const goldSpark = spark['GOLD']||[]
          if (goldSpark.length) {
            const last=goldSpark[goldSpark.length-1], prev=goldSpark[goldSpark.length-2]||last
            const pct= prev? ((last-prev)/prev*100):0
            t.push({ name:'GOLD', val: String(last.toFixed(2)), pct: Number(pct.toFixed(2)), accent:'#f59e0b' })
          } else if (gold) {
            // Show Gold card even if price is null
            t.push({ name:'GOLD', val: 'N/A', pct:undefined, accent:'#f59e0b' })
          }
        }
        
        // USDINR from indices first (if available), then from spark
        const fxIndex = indices.find((x:any)=>{
          const nm = (x.name||'').toUpperCase()
          return nm.includes('USD/INR') || nm.includes('USDINR')
        })
        if (fxIndex && fxIndex.price != null) {
          t.push({
            name:'USD/INR',
            val: String(Number(fxIndex.price||0).toFixed(2)),
            pct: Number(fxIndex.chg_pct||0),
            accent:'#10b981'
          })
        } else {
          const fx = spark['USDINR']||[]
          if (fx.length) {
            const last=fx[fx.length-1], prev=fx[fx.length-2]||last
            const pct= prev? ((last-prev)/prev*100):0
            t.push({ name:'USD/INR', val: String(last.toFixed(2)), pct: Number(pct.toFixed(2)), accent:'#10b981' })
          } else if (fxIndex) {
            t.push({ name:'USD/INR', val: 'N/A', pct: undefined, accent:'#10b981' })
          }
        }
      } else {
        // Global markets
        indices.forEach((idx:any) => {
          const name = idx.name || ''
          let displayName = name
          let accent = '#1d4ed8'
          
          if (name.toLowerCase().includes('s&p')) { displayName = 'S&P 500'; accent = '#1d4ed8' }
          else if (name.toLowerCase().includes('nasdaq')) { displayName = 'NASDAQ'; accent = '#7c3aed' }
          else if (name.toLowerCase().includes('ftse')) { displayName = 'FTSE 100'; accent = '#f59e0b' }
          else if (name.toLowerCase().includes('hang seng')) { displayName = 'Hang Seng'; accent = '#10b981' }
          
          t.push({
            name: displayName,
            val: String(Number(idx.price||0).toFixed(2)),
            pct: Number(idx.chg_pct||0),
            accent
          })
        })
      }
    } catch {}
    return t
  }, [market, spark, marketRegion])

  const sentiment = useMemo(()=>{
    try {
      // Sentiment based only on Nifty 50 performance
      const niftyPct = Number((tiles.find(x=>x.name==='NIFTY')?.pct) ?? 0)
      
      if (niftyPct > 0.40) return { label:'Bullish', color:'#16a34a', score:niftyPct }
      if (niftyPct >= 0.20) return { label:'Trending Upward', color:'#22c55e', score:niftyPct }
      if (niftyPct > -0.20) return { label:'Range Bound', color:'#64748b', score:niftyPct }
      if (niftyPct >= -0.40) return { label:'Trending Downward', color:'#f97316', score:niftyPct }
      return { label:'Bearish', color:'#ef4444', score:niftyPct }
    } catch { return { label:'Range Bound', color:'#64748b', score:0 } }
  }, [tiles])

  const { buyPicks, sellPicks } = useMemo(() => {
    const result = { buyPicks: [] as AIPick[], sellPicks: [] as AIPick[] }
    if (!Array.isArray(picks) || picks.length === 0) return result

    const enriched = picks
      .filter((p: any) => {
        const rec = typeof p.recommendation === 'string' ? p.recommendation.toLowerCase() : ''
        return rec !== 'watch' && rec !== 'hold'
      })
      .map(p => ({
        pick: p,
        dir: classifyPickDirection(p.score_blend, primaryMode),
      }))
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
    const rows: Array<{ symbol: string; score: number; change?: number }> = []
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

      rows.push({ symbol, score, change })
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
    } catch {}
    try {
      const session = localStorage.getItem('arise_session')||'local'
      await fetch('/v1/memory/upsert', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ session_id: session, data: { risk, modes, primary_mode: primaryMode, auxiliary_modes: auxiliaryModes } }) })
    } catch {}
    setPrefsOpen(false)
    // Refresh picks if drawer is open to reflect new trading mode
    if (showPicks && picks.length > 0) {
      onFetchPicks(true)
    }
  }

  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState<Array<{role:'user'|'assistant', text:string}>>([])
  const [chatLayout, setChatLayout] = useState<ChatLayout>('bottom-docked')
  const [chatLoading, setChatLoading] = useState(false)
  const chatMessagesRef = useRef<HTMLDivElement | null>(null)
  const onSend = React.useCallback(async () => {
    const t = chatInput.trim()
    if (!t) return
    setChat(c=>[...c, { role:'user', text:t }])
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
      setChat(c=>[...c, { role:'assistant', text: responseText }])
    } catch (err) {
      console.error('Chat error:', err)
      setChat(c=>[...c, { role:'assistant', text: 'Sorry, I am having trouble connecting. Please check if OpenAI API key is configured.' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, sessionId, picks, market, sentiment, risk, primaryMode, universe])

  useEffect(() => {
    const el = chatMessagesRef.current
    if (!el || chat.length === 0) return
    el.scrollTop = el.scrollHeight
  }, [chat.length])

  return (
    <div style={{display:'flex', height:'100vh', background:'#f9fafb', overflow:'hidden'}}>
      {/* Continuous Left Sidebar - dark unified band */}
      <aside style={{
        width:116,
        background:'#0f172a',
        boxShadow:'2px 0 8px rgba(15,23,42,0.7)',
        display:'flex',
        flexDirection:'column',
        position:'fixed',
        height:'100vh',
        left:0,
        top:0,
        zIndex:100
      }}>
        {/* Branding */}
        <div style={{padding:'12px 10px 10px 10px', borderBottom:'1px solid rgba(15,23,42,0.9)'}}>
          <div style={{display:'flex', alignItems:'baseline', gap:4, maxWidth:'100%'}}>
            <FyntrixLogo fontSize={20} fontWeight={900} />
            <div
              style={{
                fontSize:9,
                color:'rgba(226,232,240,0.9)',
                fontWeight:400,
                fontStyle:'italic',
                cursor:'pointer',
                textDecoration:'underline',
                textDecorationStyle:'dotted',
                whiteSpace:'nowrap'
              }}
              onClick={()=>setShowAgents(true)}
              onMouseEnter={e=>{
                e.currentTarget.style.color = '#f9fafb'
              }}
              onMouseLeave={e=>{
                e.currentTarget.style.color = 'rgba(226,232,240,0.9)'
              }}
            >
              (trading assisted by AI agents)
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav style={{display:'flex', flexDirection:'column', gap:6, padding:'10px 6px', flex:1}}>
          <button
            title="Home"
            onClick={handleHomeClick}
            style={{
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              gap:4,
              padding:'10px 6px',
              borderRadius:999,
              background:'rgba(30,64,175,0.95)',
              border:'1px solid rgba(148,163,184,0.9)',
              cursor:'pointer',
              width:'100%',
              transition:'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease'
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.background = 'rgba(37,99,235,0.98)'
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.6)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.background = 'rgba(30,64,175,0.95)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <LayoutGrid size={18} color="#e5e7eb" />
            <span style={{fontSize:12, fontWeight:600, color:'#e5e7eb'}}>Home</span>
          </button>

          <button
            title="Preferences"
            onClick={()=>setPrefsOpen(true)}
            style={{
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              gap:4,
              padding:'10px 6px',
              borderRadius:999,
              background:'rgba(15,23,42,0.9)',
              border:'1px solid rgba(30,41,59,0.9)',
              cursor:'pointer',
              width:'100%',
              transition:'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease, borderColor 0.15s ease'
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.background = 'rgba(37,99,235,0.95)'
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.5)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.borderColor = 'rgba(148,163,184,0.9)'
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.background = 'rgba(15,23,42,0.9)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'rgba(30,41,59,0.9)'
            }}
          >
            <SlidersHorizontal size={18} color="#e5e7eb" />
            <span style={{fontSize:12, fontWeight:500, color:'#e5e7eb'}}>Preferences</span>
          </button>

          <button
            title="Portfolio"
            onClick={()=>setShowPortfolio(true)}
            style={{
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              gap:4,
              padding:'10px 6px',
              borderRadius:999,
              background:'rgba(15,23,42,0.9)',
              border:'1px solid rgba(30,41,59,0.9)',
              cursor:'pointer',
              width:'100%',
              transition:'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease, borderColor 0.15s ease'
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.background = 'rgba(37,99,235,0.95)'
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.5)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.borderColor = 'rgba(148,163,184,0.9)'
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.background = 'rgba(15,23,42,0.9)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'rgba(30,41,59,0.9)'
            }}
          >
            <BriefcaseBusiness size={18} color="#e5e7eb" />
            <span style={{fontSize:12, fontWeight:500, color:'#e5e7eb'}}>Portfolio</span>
          </button>
          <button
            title="Watchlist"
            onClick={()=>setShowWatchlist(true)}
            style={{
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              gap:4,
              padding:'10px 6px',
              borderRadius:999,
              background:'rgba(15,23,42,0.9)',
              border:'1px solid rgba(30,41,59,0.9)',
              cursor:'pointer',
              width:'100%',
              transition:'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease, borderColor 0.15s ease'
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.background = 'rgba(37,99,235,0.95)'
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.5)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.borderColor = 'rgba(148,163,184,0.9)'
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.background = 'rgba(15,23,42,0.9)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'rgba(30,41,59,0.9)'
            }}
          >
            <Image size={18} color="#e5e7eb" />
            <span style={{fontSize:12, fontWeight:500, color:'#e5e7eb'}}>Watchlist</span>
          </button>
          <button 
            title="Scalping Monitor"
            onClick={()=>setShowScalpingMonitor(true)} 
            style={{
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              gap:4,
              padding:'10px 6px',
              borderRadius:999,
              background:'rgba(15,23,42,0.9)',
              border:'1px solid rgba(30,41,59,0.9)',
              cursor:'pointer',
              width:'100%',
              transition:'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease, borderColor 0.15s ease'
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.background = 'rgba(37,99,235,0.95)'
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.5)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.borderColor = 'rgba(148,163,184,0.9)'
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.background = 'rgba(15,23,42,0.9)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'rgba(30,41,59,0.9)'
            }}
          >
            <SquareActivity size={18} color="#e5e7eb" />
            <span style={{fontSize:12, fontWeight:500, color:'#e5e7eb'}}>Scalp</span>
          </button>
          <button 
            title="Winning Trades"
            onClick={async ()=>{
              setShowWinningTrades(true)
              try {
                setLoadingWinningTrades(true)
                const data = await getWinningTrades({ lookback_days: 7, universe: universe.toLowerCase() })
                setWinningTradesData(data)
                try {
                  localStorage.setItem('arise_winning_trades', JSON.stringify(data))
                } catch {}
              } catch (e) {
                console.error('Failed to load winning trades:', e)
              } finally {
                setLoadingWinningTrades(false)
              }
            }} 
            style={{
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              gap:4,
              padding:'10px 6px',
              borderRadius:999,
              background:'rgba(15,23,42,0.9)',
              border:'1px solid rgba(30,41,59,0.9)',
              cursor:'pointer',
              width:'100%',
              transition:'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease, borderColor 0.15s ease'
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.background = 'rgba(37,99,235,0.95)'
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.5)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.borderColor = 'rgba(148,163,184,0.9)'
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.background = 'rgba(15,23,42,0.9)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'rgba(30,41,59,0.9)'
            }}
          >
            <Trophy size={18} color="#e5e7eb" />
            <span style={{fontSize:12, fontWeight:500, color:'#e5e7eb'}}>Winners</span>
          </button>
          <button
            title="RL Metrics"
            onClick={async ()=>{
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
                console.error('Failed to load RL metrics:', e)
                setRlMetricsError('Failed to load RL metrics')
              } finally {
                setLoadingRlMetrics(false)
              }
            }}
            style={{
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              gap:4,
              padding:'10px 6px',
              borderRadius:999,
              background:'rgba(15,23,42,0.9)',
              border:'1px solid rgba(30,41,59,0.9)',
              cursor:'pointer',
              width:'100%',
              transition:'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease, borderColor 0.15s ease'
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.background = 'rgba(37,99,235,0.95)'
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.5)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.borderColor = 'rgba(148,163,184,0.9)'
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.background = 'rgba(15,23,42,0.9)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'rgba(30,41,59,0.9)'
            }}
          >
            <SlidersHorizontal size={18} color="#e5e7eb" />
            <span style={{fontSize:12, fontWeight:500, color:'#e5e7eb'}}>RL</span>
          </button>
        </nav>
        
        {/* Primary Mode Display at Bottom */}
        <div style={{padding:'16px', borderTop:'1px solid rgba(30,64,175,0.7)'}}>
          <div style={{fontSize:10, fontWeight:700, color:'rgba(148,163,184,0.9)', marginBottom:8}}>TRADING MODE</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
            {availableModes.filter(m => m.value !== 'Commodity').map((mode)=> {
              const isActive = primaryMode === mode.value
              // Extract text without emoji for display
              const displayText = mode.value
              return (
                <button
                  key={mode.value}
                  onClick={()=>{
                    setPrimaryMode(mode.value)
                    setAuxiliaryModes(aux => aux.filter(m => m !== mode.value))
                    try{localStorage.setItem('arise_primary_mode', mode.value)}catch{}
                    // Refresh picks if drawer is open
                    if (showPicks) onFetchPicks(true)
                  }}
                  onMouseEnter={(e)=>{
                    const rect = e.currentTarget.getBoundingClientRect()
                    setTip({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 8,
                      text: mode.description,
                      type: 'mode'
                    })
                    e.currentTarget.style.background = 'rgba(37,99,235,0.25)'
                    e.currentTarget.style.border = '1px solid rgba(148,163,184,0.9)'
                  }}
                  onMouseLeave={e=>{
                    setTip(null)
                    e.currentTarget.style.background = isActive ? 'rgba(37,99,235,0.3)' : 'transparent'
                    e.currentTarget.style.border = isActive
                      ? '1px solid rgba(59,130,246,0.9)'
                      : '1px solid rgba(30,64,175,0.7)'
                  }}
                  style={{
                    padding:'4px 8px',
                    fontSize:9,
                    fontWeight:600,
                    borderRadius:999,
                    border: isActive? '1px solid rgba(59,130,246,0.9)' : '1px solid rgba(30,64,175,0.7)',
                    background: isActive? 'rgba(37,99,235,0.3)' : 'transparent',
                    color: '#e5e7eb',
                    cursor:'pointer',
                    whiteSpace:'nowrap',
                    letterSpacing:0.3
                  }}
                >
                  {displayText} {isActive?'✓':''}
                </button>
              )
            })}
          </div>
        </div>
      </aside>

      <div
        style={{
          position:'fixed',
          left:116,
          right:0,
          top:0,
          height:44,
          background:'#0f172a',
          zIndex:90,
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          padding:'0 24px',
          boxShadow:'0 2px 8px rgba(15,23,42,0.9)'
        }}
      >
        <div style={{display:'flex', alignItems:'center', gap:16, marginLeft:220}}>
          <button
            style={{
              background:'transparent',
              border:'none',
              color:'rgba(203,213,225,0.96)',
              fontSize:12,
              fontWeight:600,
              cursor:'pointer',
              padding:'4px 6px',
              letterSpacing:0.25
            }}
            onMouseEnter={e=>{e.currentTarget.style.color='#f9fafb'; e.currentTarget.style.textDecoration='underline'}}
            onMouseLeave={e=>{e.currentTarget.style.color='rgba(203,213,225,0.96)'; e.currentTarget.style.textDecoration='none'}}
          >
            Company
          </button>
          <button
            style={{
              background:'transparent',
              border:'none',
              color:'rgba(203,213,225,0.96)',
              fontSize:12,
              fontWeight:600,
              cursor:'pointer',
              padding:'4px 6px',
              letterSpacing:0.25
            }}
            onMouseEnter={e=>{e.currentTarget.style.color='#f9fafb'; e.currentTarget.style.textDecoration='underline'}}
            onMouseLeave={e=>{e.currentTarget.style.color='rgba(203,213,225,0.96)'; e.currentTarget.style.textDecoration='none'}}
          >
            Products
          </button>
          <button
            title="Disclosure & Disclaimer"
            onClick={()=>setShowDisclosure(true)}
            style={{
              display:'flex',
              alignItems:'center',
              gap:8,
              padding:'6px 10px',
              borderRadius:999,
              background:'rgba(15,23,42,0.95)',
              border:'1px solid rgba(148,163,184,0.85)',
              cursor:'pointer',
              color:'#e5e7eb',
              fontSize:11,
              fontWeight:600,
              letterSpacing:0.4
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(30,64,175,0.95)'; e.currentTarget.style.boxShadow='0 3px 8px rgba(37,99,235,0.5)'; e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(15,23,42,0.95)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'}}
          >
            <Copy size={16} color="#e5e7eb" />
            <span style={{textTransform:'uppercase'}}>Disclosure</span>
          </button>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <button
            title="Notifications"
            style={{
              width:32,
              height:32,
              borderRadius:999,
              background:'rgba(15,23,42,0.95)',
              border:'1px solid rgba(148,163,184,0.9)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              cursor:'pointer',
              transition:'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease'
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(30,64,175,0.95)'; e.currentTarget.style.boxShadow='0 3px 8px rgba(37,99,235,0.5)'; e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(15,23,42,0.95)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'}}
          >
            <Bell size={16} color="#e5e7eb" />
          </button>
          <button
            title="Chat"
            style={{
              width:32,
              height:32,
              borderRadius:999,
              background:'rgba(15,23,42,0.95)',
              border:'1px solid rgba(148,163,184,0.9)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              cursor:'pointer',
              transition:'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease'
            }}
            onClick={()=>{
              try {
                const el = chatMessagesRef.current
                if (el) el.scrollIntoView({ behavior:'smooth' })
              } catch {}
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(30,64,175,0.95)'; e.currentTarget.style.boxShadow='0 3px 8px rgba(37,99,235,0.5)'; e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(15,23,42,0.95)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'}}
          >
            <MessageCircle size={16} color="#e5e7eb" />
          </button>
          <button
            title="What's New"
            style={{
              width:32,
              height:32,
              borderRadius:999,
              background:'rgba(15,23,42,0.95)',
              border:'1px solid rgba(148,163,184,0.9)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              cursor:'pointer',
              transition:'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease'
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(30,64,175,0.95)'; e.currentTarget.style.boxShadow='0 3px 8px rgba(37,99,235,0.5)'; e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(15,23,42,0.95)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'}}
          >
            <Megaphone size={16} color="#e5e7eb" />
          </button>
          <button
            title="Account"
            style={{
              width:32,
              height:32,
              borderRadius:999,
              background:'rgba(15,23,42,0.95)',
              border:'1px solid rgba(148,163,184,0.9)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              cursor:'pointer',
              transition:'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease'
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(30,64,175,0.95)'; e.currentTarget.style.boxShadow='0 3px 8px rgba(37,99,235,0.5)'; e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(15,23,42,0.95)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'}}
          >
            <User size={16} color="#e5e7eb" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{marginLeft:116, flex:1, display:'flex', gap:20, padding:'60px 32px 20px 32px', maxWidth:'calc(100vw - 116px)', height:'100vh', boxSizing:'border-box', overflow:'hidden'}}>

        <div style={{flex:1, width:'auto', display:'flex', flexDirection:'column', minHeight:0, overflowY:'hidden', paddingRight:4}}>
          {/* ARIS Chat - Single, Intelligent, Stable Interface */}
          <section style={{
            background:'#ffffff',
            borderRadius:16,
            border:'2px solid #e5e7eb',
            marginBottom:20,
            boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
            overflow:'hidden',
            height: chat.length === 0
              ? 200
              : 380, // More compact when empty in bottom-docked mode
            display:'flex',
            flexDirection:'column',
            transition:'height 0.3s ease', // Smooth height transition
            order: 2
          }}>
            {/* Header with Clear Button */}
            <div style={{
              padding:'14px 20px',
              borderBottom:'2px solid #e5e7eb',
              background:'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              display:'flex',
              alignItems:'center',
              justifyContent:'space-between'
            }}>
              <div>
                <div style={{fontWeight:700, fontSize:18, color:'#1e40af', marginBottom:2}}>
                  AI Research and Trade Strategist
                </div>
                <div style={{fontSize:12, color:'#64748b', fontStyle:'italic'}}>Ask me about markets, picks, or strategies</div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                {chat.length > 0 && (
                  <button
                    onClick={() => setChat([])}
                    style={{
                      padding:'8px 14px',
                      fontSize:12,
                      fontWeight:600,
                      borderRadius:999,
                      border:'1px solid #cbd5e1',
                      background:'#f8fafc',
                      color:'#0f172a',
                      cursor:'pointer',
                      transition:'all 0.2s',
                      boxShadow:'0 1px 3px rgba(15,23,42,0.15)',
                      display:'flex',
                      alignItems:'center',
                      gap:6
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#e2e8f0'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 3px 6px rgba(15,23,42,0.25)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f8fafc'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.15)'
                    }}
                  >
                    <span style={{fontSize:14}}>🧹</span>
                    <span>Clear chat</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chat Messages - Fixed height with FORCED scroll */}
            <div style={{
              flex:1, 
              display:'flex', 
              flexDirection:'column',
              minHeight:0, // Critical for flex scrolling
              overflow:'hidden' // Contain the scrollable child
            }}>
              <div 
                ref={(el) => {
                  chatMessagesRef.current = el
                }}
                style={{
                  flex:'1 1 auto',
                  height:'100%', // Explicit height
                  overflowY:'auto',
                  overflowX:'hidden',
                  padding:'16px 20px',
                  background:'#f9fafb',
                  fontSize:14,
                  WebkitOverflowScrolling:'touch'
                }}
                className="aris-chat-messages"
              >
                {/* Chat messages - streamlined without redundant labels */}
                {chat.length === 0 ? (
                  <div style={{padding:'8px 16px', textAlign:'center', color:'#94a3b8', fontSize:12, fontStyle:'italic'}}>
                    Start a conversation by asking a question below
                  </div>
                ) : (
                  chat.map((m, i)=> (
                  <div key={i} style={{
                    display:'flex', 
                    flexDirection:'column',
                    alignItems: m.role==='user' ? 'flex-end' : 'flex-start',
                    marginBottom:14
                  }}>
                    <div style={{
                      padding:'12px 16px',
                      borderRadius:12,
                      background: m.role==='user' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#ffffff',
                      color: m.role==='user' ? '#ffffff' : '#0f172a',
                      maxWidth:'85%',
                      lineHeight:1.7,
                      wordBreak:'break-word',
                      boxShadow: m.role==='user' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                      border: m.role==='assistant' ? '1px solid #e5e7eb' : 'none'
                    }}>
                      {m.text}
                    </div>
                  </div>
                  ))
                )}
                {chatLoading && (
                  <div style={{
                    display:'flex',
                    flexDirection:'column',
                    alignItems:'flex-start',
                    marginBottom:8
                  }}>
                    <div style={{
                      padding:'8px 12px',
                      borderRadius:999,
                      background:'#e5e7eb',
                      color:'#4b5563',
                      fontSize:12,
                      fontStyle:'italic'
                    }}>
                      Fyntrix is thinking…
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area - Fixed at bottom */}
              <div style={{
                padding:'12px 16px',
                borderTop:'1px solid #e5e7eb',
                background:'#ffffff',
                display:'flex',
                gap:10
              }}>
                <input 
                  value={chatInput} 
                  onChange={e=>setChatInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && !e.shiftKey && onSend()}
                  placeholder="Ask Fyntrix…" 
                  style={{
                    flex:1, 
                    padding:'10px 14px', 
                    border:'1px solid #e5e7eb', 
                    borderRadius:8,
                    fontSize:14,
                    fontFamily:'system-ui, -apple-system, sans-serif',
                    outline:'none',
                    transition:'all 0.15s',
                    background:'#f9fafb'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#3b82f6'
                    e.target.style.background = '#ffffff'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.background = '#f9fafb'
                  }}
                />
                <button 
                  onClick={onSend}
                  disabled={!chatInput.trim()}
                  style={{
                    padding:'10px 20px', 
                    borderRadius:8, 
                    background: chatInput.trim() ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#e5e7eb', 
                    color: chatInput.trim() ? '#ffffff' : '#94a3b8', 
                    border:'none',
                    fontWeight:600,
                    fontSize:13,
                    cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: chatInput.trim() ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none',
                    transition:'all 0.15s',
                    minWidth:70
                  }}
                  onMouseEnter={e => {
                    if (chatInput.trim()) {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 3px 6px rgba(59, 130, 246, 0.3)'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = chatInput.trim() ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </section>

          <div style={{ order: 1, flex: 1, minHeight: 0, overflowY: 'auto' }}>

          {/* Smart Insight Cards - Actionable insights */}
          {!showPicks && insights.length > 0 && (
            <InsightCards 
              insights={insights}
              onInsightClick={(insight) => {
                // Handle insight click - could open picks, analyze symbol, etc.
                if (insight.metadata && 'symbols' in insight.metadata) {
                  setShowPicks(true)
                }
              }}
              onDismiss={(id) => {
                setInsights(insights.filter(i => i.id !== id))
              }}
            />
          )}

          {/* Market Brief with Cards - Hidden only when picks drawer is shown */}
          {!showPicks && (
          <section style={{padding:12, border:'1px solid #e5e7eb', borderRadius:12, background:'#fff', marginBottom:12, boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, gap:12, flexWrap:'wrap'}}>
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                <span style={{fontWeight:600, fontSize:16}}>Market Brief</span>
                <div style={{display:'flex', gap:12, borderBottom:'1px solid #e5e7eb', paddingBottom:4}}>
                  {[
                    { value: 'India' as const, label: 'India Markets', icon: '🇮🇳' },
                    { value: 'Global' as const, label: 'World Markets', icon: <Globe/> },
                  ].map(tab => {
                    const isActive = marketRegion === tab.value
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => {
                          if (marketRegion === tab.value) return
                          const r = tab.value
                          setMarketRegion(r)
                          try{localStorage.setItem('arise_market_region', r)}catch{}
                        }}
                        style={{
                          border:'none',
                          background:'transparent',
                          padding:'2px 4px 6px 4px',
                          borderBottom:isActive ? '3px solid #2563eb' : '3px solid transparent',
                          cursor:'pointer',
                          display:'flex',
                          alignItems:'center',
                          gap:6,
                          fontSize:13,
                          color:isActive ? '#1d4ed8' : '#4b5563',
                          fontWeight:isActive ? 600 : 500
                        }}
                      >
                        <span style={{fontSize:14}}>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4}}>
                {(() => {
                  // Determine market open status strictly from weekday + intraday time window
                  const now = new Date()
                  const day = now.getDay() // 0=Sun, 6=Sat
                  const isWeekday = day >= 1 && day <= 5

                  const hours = now.getHours()
                  const minutes = now.getMinutes()
                  const currentTime = hours * 60 + minutes // minutes since midnight
                  const marketOpen = 9 * 60 + 15  // 9:15 AM = 555 minutes
                  const marketClose = 15 * 60 + 30 // 3:30 PM = 930 minutes

                  const isMarketOpen = isWeekday && currentTime >= marketOpen && currentTime <= marketClose

                  // Determine appropriate timestamp:
                  // 1) Prefer backend-provided market.as_of
                  // 2) If market is closed and as_of missing, approximate last trading
                  //    session as previous weekday at 3:30 PM IST
                  // 3) Fallback to current time only for live mode
                  let baseAsOf: Date | null = null
                  if (market && market.as_of) {
                    baseAsOf = new Date(market.as_of)
                  }

                  if (!baseAsOf) {
                    if (!isMarketOpen) {
                      const closing = new Date(now)
                      // Move back to previous weekday (Mon-Fri)
                      do {
                        closing.setDate(closing.getDate() - 1)
                      } while (closing.getDay() === 0 || closing.getDay() === 6)
                      // Set to typical India cash-market close time 3:30 PM
                      closing.setHours(15, 30, 0, 0)
                      baseAsOf = closing
                    } else {
                      baseAsOf = now
                    }
                  }

                  const asOf = new Date(baseAsOf as Date)
                  if (!isMarketOpen) {
                    // For closed markets, always show the typical close time 3:30 PM
                    asOf.setHours(15, 30, 0, 0)
                  }

                  const datePart = asOf.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  const timePart = asOf.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  const label = isMarketOpen
                    ? `Data as of ${datePart}, ${timePart}`
                    : `Last close · ${datePart}, ${timePart}`

                  return (
                    <React.Fragment>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <span style={{
                          fontSize:11, 
                          padding:'3px 8px', 
                          borderRadius:999, 
                          background: isMarketOpen ? '#dcfce7' : '#fef3c7',
                          color: isMarketOpen ? '#166534' : '#92400e',
                          fontWeight:600
                        }}>
                          {isMarketOpen ? '🟢 Live' : '⏸️ Market Closed'}
                        </span>
                        <span style={{
                          fontSize:11,
                          color:'#64748b',
                          whiteSpace:'nowrap',
                          maxWidth:240,
                          overflow:'hidden',
                          textOverflow:'ellipsis'
                        }}>{label}</span>
                      </div>
                    </React.Fragment>
                  )
                })()}
                <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2}}>
                  <span style={{fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px'}}>Nifty 50 Sentiment</span>
                  <span style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:11, padding:'2px 8px', borderRadius:999, background:'#f1f5f9', color: sentiment.color, border:'1px solid #e2e8f0' }}>
                    <span style={{display:'inline-flex', gap:1}}>
                      {Array.from({length:5}).map((_,i)=>{
                        const active = (sentiment.score||0) > ((i-2)*15)
                        const bg = active ? sentiment.color : '#cbd5e1'
                        return <span key={i} style={{width:3, height:9, borderRadius:2, background:bg}} />
                      })}
                    </span>
                    <span style={{fontWeight:600}}>{sentiment.label}</span>
                  </span>
                </div>
              </div>
            </div>
            <div style={{display:'flex', gap:8, overflowX:'auto', paddingBottom:4}}>
              {tiles.length ? (
                tiles.map(t => {
                  const isPositive = (t.pct || 0) >= 0
                  const trendColor = isPositive ? '#16a34a' : '#ef4444'
                  return (
                    <div
                      key={t.name}
                      style={{
                        minWidth:150,
                        flex:'0 0 auto',
                        padding:10,
                        border:'1px solid #e5e7eb',
                        borderRadius:12,
                        background:'#ffffff',
                        boxShadow:'0 1px 3px rgba(15,23,42,0.05)'
                      }}
                    >
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6}}>
                        <div>
                          <div style={{fontSize:12, fontWeight:700, color:'#0f172a', textTransform:'uppercase', marginBottom:1}}>
                            {t.name === 'GOLD' ? 'GOLD (IN $/OUNCE)' : t.name}
                          </div>
                        </div>
                        {typeof t.pct === 'number' ? (
                          <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                            <span
                              style={{
                                fontSize:11,
                                fontWeight:600,
                                color:trendColor,
                                padding:'2px 8px',
                                borderRadius:999,
                                background:(t.pct || 0) >= 0 ? '#ecfdf3' : '#fef2f2'
                              }}
                            >
                              {(t.pct || 0) >= 0 ? '↑' : '↓'} {Math.abs(t.pct).toFixed(2)}%
                            </span>
                          </div>
                        ) : (
                          <div style={{fontSize:11, color:'#94a3b8'}}>-</div>
                        )}
                      </div>
                      <div style={{fontSize:16, fontWeight:700, marginBottom:6}}>{t.val}</div>
                      <div style={{height:28, position:'relative'}}>
                        {(() => {
                          // Smart key lookup - try exact match, then fallbacks for global markets
                          let key = t.name
                          if (key === 'USD/INR') key = 'USDINR'
                          // Try exact match first
                          let s = spark[key] || []
                          // If not found and it's a global market, try alternative keys
                          if (!s.length && marketRegion === 'Global') {
                            if (key === 'FTSE 100') s = spark['LSE (FTSE 100)'] || spark['^FTSE'] || []
                            else if (key === 'S&P 500') s = spark['S&P 500'] || spark['^GSPC'] || []
                            else if (key === 'NASDAQ') s = spark['NASDAQ'] || spark['^IXIC'] || []
                            else if (key === 'Hang Seng') s = spark['Hang Seng'] || spark['^HSI'] || []
                          }
                          if (!s.length) {
                            return (
                              <div style={{fontSize:10, color:'#cbd5e1', textAlign:'center', paddingTop:12}}>
                                Chart loading...
                              </div>
                            )
                          }
                          return (
                            <svg
                              width="100%"
                              height={32}
                              style={{display:'block'}}
                              viewBox="0 0 180 40"
                              preserveAspectRatio="none"
                              onMouseMove={e => {
                                const last = s[s.length - 1]
                                const prev = s[s.length - 2] ?? last
                                const pct = prev ? ((last - prev) / prev) * 100 : 0
                                if (tipTimer) clearTimeout(tipTimer)
                                const timer = setTimeout(() => {
                                  const maxX = Math.max(0, (window.innerWidth || 0) - 200)
                                  const maxY = Math.max(0, (window.innerHeight || 0) - 60)
                                  const x = Math.min(e.clientX + 8, maxX)
                                  const y = Math.min(e.clientY + 8, maxY)
                                  setTip({
                                    x,
                                    y,
                                    text: `Last ${last.toFixed(2)} · Prev ${prev.toFixed(2)} · ${(pct >= 0 ? '+' : '') + pct.toFixed(2)}%`
                                  })
                                }, 60)
                                setTipTimer(timer)
                              }}
                              onMouseLeave={() => {
                                if (tipTimer) clearTimeout(tipTimer)
                                setTip(null)
                              }}
                            >
                              {(() => {
                                // Build a smooth sparkline based on the actual intraday series
                                const tilePct = t.pct ?? 0
                                const strokeColor = tilePct >= 0 ? '#22c55e' : '#f97373'
                                const areaFill = tilePct >= 0 ? '#dcfce7' : '#fee2e2'

                                const width = 180
                                const height = 40

                                const values = s
                                const n = values.length
                                if (n < 2) {
                                  const midY = height - 10
                                  const dFlat = `M0,${midY} L${width},${midY}`
                                  return (
                                    <path
                                      d={dFlat}
                                      stroke={strokeColor}
                                      strokeWidth={2}
                                      fill="none"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      opacity={0.9}
                                    />
                                  )
                                }

                                let min = Math.min(...values)
                                let max = Math.max(...values)
                                if (min === max) {
                                  // Avoid divide-by-zero: expand a tiny band around the value
                                  min = min - 1
                                  max = max + 1
                                }
                                const span = max - min

                                const marginTop = 6
                                const marginBottom = 6
                                const usableHeight = height - marginTop - marginBottom

                                const points = values.map((v, idx) => {
                                  const x = (idx / (n - 1)) * width
                                  const norm = (v - min) / span // 0..1
                                  const y = height - marginBottom - norm * usableHeight
                                  return { x, y }
                                })

                                const baseY = height - marginBottom
                                let areaPath = `M${points[0].x},${baseY}`
                                for (let i = 0; i < points.length; i++) {
                                  const p = points[i]
                                  areaPath += ` L${p.x},${p.y}`
                                }
                                areaPath += ` L${points[points.length - 1].x},${baseY} Z`

                                // Quadratic smoothing between points for a soft curve
                                let d = `M${points[0].x},${points[0].y}`
                                for (let i = 1; i < points.length; i++) {
                                  const prev = points[i - 1]
                                  const curr = points[i]
                                  const midX = (prev.x + curr.x) / 2
                                  const midY = (prev.y + curr.y) / 2
                                  d += ` Q${prev.x},${prev.y} ${midX},${midY}`
                                }
                                // Ensure we end exactly at the last point
                                const lastPoint = points[points.length - 1]
                                d += ` T${lastPoint.x},${lastPoint.y}`

                                return (
                                  <>
                                    <path d={areaPath} fill={areaFill} stroke="none" opacity={0.6} />
                                    <path d={d} stroke={strokeColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
                                  </>
                                )
                              })()}
                            </svg>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div style={{fontSize:12, opacity:0.7, padding:20, textAlign:'center'}}>
                  Loading market data...
                </div>
              )}
            </div>
            {showHeatMap && picks.length > 0 && (
              <div style={{marginTop:12}}>
                <MarketHeatMap
                  stocks={heatMapStocks}
                  onStockClick={(symbol) => {
                    const row = picks.find((p: any) => p.symbol === symbol)
                    if (row) {
                      setChartView({ symbol: row.symbol, analysis: row })
                    } else {
                      setChartView({ symbol })
                    }
                  }}
                  universe={universe}
                  modeLabel={primaryMode}
                />
              </div>
            )}
          </section>
          )}

          {/* Top Five Picks Panel - replaces Market Brief when showPicks is true */}
          {showPicks && (
          <section style={{padding:16, border:'1px solid #e5e7eb', borderRadius:12, background:'#fff', marginBottom:16, boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
          <div style={{padding:'12px 0 8px 0', borderBottom:'1px solid #e5e7eb', marginBottom:12}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, gap:12, flexWrap:'wrap'}}>
              <div style={{fontWeight:600, fontSize:18}}>★ Top Five Picks</div>
              <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                <div style={{fontSize:12, color:'#64748b'}}>
                  {loadingPicks
                    ? `Agents are working… Refreshing ${primaryMode} recommendations for ${universe.toUpperCase()}`
                    : (isIndiaMarketOpen && picksAsOf
                        ? `Last updated ${dayjs(picksAsOf).fromNow()} (${new Date(picksAsOf).toLocaleTimeString()})`
                        : '')}
                </div>
                {isIndiaMarketOpen && (
                <button
                  disabled={loadingPicks}
                  onClick={() => onFetchPicks(true)}
                  style={{
                    border:'2px solid #3b82f6',
                    background: loadingPicks ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    borderRadius:999,
                    padding:'6px 14px',
                    fontSize:12,
                    fontWeight:600,
                    color:'#fff',
                    cursor: loadingPicks ? 'not-allowed' : 'pointer',
                    boxShadow:'0 2px 8px rgba(59, 130, 246, 0.3)',
                    display:'flex',
                    alignItems:'center',
                    gap:6,
                    opacity: loadingPicks ? 0.7 : 1
                  }}
                >
                  🔄 Recalculate
                </button>
                )}
                <button
                  onClick={()=>setShowPicks(false)}
                  style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:6, padding:'4px 8px', fontSize:12}}
                >
                  Close
                </button>
              </div>
            </div>
            {picksAsOf && picks.length > 0 && (!isIndiaMarketOpen || isPreviousSessionData) && (
            <div style={{fontSize:11, color:'#92400e', maxWidth:420}}>
              {!isIndiaMarketOpen
                ? "Markets are closed. These recommendations are based on data from the last trading session (around 3:15 PM). They'll refresh automatically when markets reopen."
                : "These recommendations are from the last trading session. Fresh picks will appear automatically once the agents complete a new run for today."}
            </div>
            )}
            {/* Mode Selector */}
            <div style={{marginTop:10}}>
              <div style={{display:'flex', flexWrap:'wrap', gap:12, borderBottom:'1px solid #e5e7eb', paddingBottom:8, marginBottom:8}}>
                {availableModes
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
                          try{localStorage.setItem('arise_primary_mode', newMode)}catch{}
                        }}
                        onMouseEnter={(e)=>{
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTip({
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                            text: mode.description,
                            type: 'mode'
                          })
                        }}
                        onMouseLeave={()=>setTip(null)}
                        style={{
                          border:'none',
                          background:isActive ? '#eff6ff' : 'transparent',
                          padding:'6px 10px 10px 10px',
                          borderRadius:6,
                          borderBottom:isActive ? '3px solid #2563eb' : '3px solid transparent',
                          cursor:'pointer',
                          minWidth:90
                        }}
                      >
                        <div style={{fontSize:13, fontWeight:isActive ? 700 : 500, color:isActive ? '#1d4ed8' : '#4b5563'}}>
                          {mode.display_name}
                        </div>
                        <div style={{fontSize:11, color:'#6b7280'}}>
                          {mode.horizon}
                        </div>
                      </button>
                    )
                  })}
              </div>
              <div style={{display:'flex', flexWrap:'wrap', gap:16, alignItems:'center'}}>
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
                        try{localStorage.setItem('arise_universe', u)}catch{}
                        onFetchPicks()
                      }}
                      style={{
                        display:'flex',
                        alignItems:'center',
                        gap:6,
                        padding:'6px 10px',
                        borderRadius:999,
                        border:isActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background:isActive ? '#eff6ff' : '#f9fafb',
                        cursor:isDisabled ? 'not-allowed' : 'pointer',
                        opacity:isDisabled ? 0.5 : 1,
                        fontSize:12,
                        color:isActive ? '#1d4ed8' : '#0f172a'
                      }}
                    >
                      <span
                        style={{
                          width:12,
                          height:12,
                          borderRadius:999,
                          border:'2px solid ' + (isActive ? '#2563eb' : '#cbd5e1'),
                          background:isActive ? '#2563eb' : '#fff'
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
              marginBottom:10,
              padding:'8px 10px',
              borderRadius:8,
              background:'#fef3c7',
              border:'1px solid #facc15',
              fontSize:12,
              color:'#92400e'
            }}>
              {picksSystemMessage}
            </div>
          )}

          <div style={{padding:10}}>
            {loadingPicks && picks.length === 0 ? (
              <div style={{textAlign:'center', padding:40, color:'#64748b'}}>
                <div style={{fontSize:32, marginBottom:12}}>⏳</div>
                <div style={{fontSize:14}}>
                  {`Agents are working… Generating fresh ${primaryMode} Top Five Picks for ${universe.toUpperCase()}. `}
                  {!picksAsOf
                    ? 'The first run of the day can take up to about a minute while data loads. Later runs will be much faster.'
                    : primaryMode === 'Scalping'
                      ? 'This usually takes under a minute in Scalping mode.'
                      : 'This usually completes in a few seconds once today\'s data is cached.'}
                </div>
              </div>
            ) : picks.length ? (
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', minWidth:'850px', fontSize:13, borderCollapse:'separate', borderSpacing:0}}>
                  <thead>
                    <tr style={{textAlign:'left', color:'#64748b', fontSize:12, fontWeight:600}}>
                      <th style={{padding:'10px 8px', width:'95px'}}>Symbol</th>
                      <th style={{padding:'10px 8px', width:'75px'}}>Score</th>
                      <th style={{padding:'10px 8px', width:'130px'}}>Recommendation</th>
                      <th style={{padding:'10px 8px'}}>Key Findings</th>
                      <th style={{padding:'10px 8px', width:'95px', textAlign:'center'}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyPicks.length > 0 && (
                      <React.Fragment>
                        <tr>
                          <td colSpan={5} style={{padding:'8px 8px', fontWeight:600, fontSize:13, color:'#166534', background:'#ecfdf5'}}>
                            Top Five Buy Picks
                          </td>
                        </tr>
                        {buyPicks.map((r:any, i:number)=> {
                          const score = typeof r.score_blend === 'number' ? r.score_blend : 0
                          const dir = classifyPickDirection(score, primaryMode)
                          const recommendation = dir ? dir.label : (r.recommendation || 'Buy')
                          return (
                          <React.Fragment key={`buy-${r.symbol}-${i}`}>
                            <tr>
                              <td 
                                style={{
                                  padding:'10px 8px', 
                                  fontWeight:600, 
                                  cursor:'pointer',
                                  color:'#2563eb',
                                  textDecoration:'underline',
                                  textDecorationStyle:'dotted',
                                  textDecorationColor:'#93c5fd'
                                }}
                                onClick={()=>setChartView({symbol: r.symbol, analysis: r})}
                                onMouseEnter={(e)=>{
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setTip({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 8,
                                    text: '📊 Click to view interactive chart',
                                    type: 'chart'
                                  })
                                }}
                                onMouseLeave={()=>setTip(null)}
                              >
                                {r.symbol}
                              </td>
                              <td style={{padding:'10px 8px'}}>
                                <span 
                                  style={{fontWeight:600, color:getScoreColor(r.score_blend), cursor:'pointer', fontSize:14}} 
                                  onClick={()=>setExplainPick(explainPick===r.symbol? null : r.symbol)}
                                  onMouseEnter={(e)=>{
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    setTip({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top - 8,
                                      text: '🤖 Click to see agent breakdown',
                                      type: 'score'
                                    })
                                  }}
                                  onMouseLeave={()=>setTip(null)}
                                >
                                  {r.score_blend}%
                                </span>
                              </td>
                              <td style={{padding:'10px 8px'}}>
                                <div style={{display:'flex', alignItems:'center', gap:6}}>
                                  <span style={{
                                    padding:'4px 10px',
                                    borderRadius:6,
                                    fontSize:12,
                                    fontWeight:600,
                                    whiteSpace:'nowrap',
                                    display:'inline-block',
                                    background: recommendation === 'Sell' || recommendation === 'Strong Sell' ? '#fee2e2' : '#dcfce7',
                                    color: recommendation === 'Sell' || recommendation === 'Strong Sell' ? '#991b1b' : '#166534'
                                  }}>
                                    {recommendation}
                                  </span>
                                </div>
                              </td>
                              <td 
                                style={{
                                  padding:'10px 8px', 
                                  color:'#475569', 
                                  fontSize:13,
                                  lineHeight:'1.5'
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
                                  const text = findings.length > 0 ? findings.slice(0,2).join(', ') + (findings.length > 2 ? '...' : '') : (r.rationale || 'Multi-agent analysis complete')
                                  return text.charAt(0).toUpperCase() + text.slice(1)
                                })()}
                              </td>
                              <td style={{padding:'10px 8px', textAlign:'center'}}>
                                <button 
                                  onClick={()=>onAnalyze(r)} 
                                  style={{
                                    padding:'6px 16px', 
                                    fontSize:13, 
                                    borderRadius:999, 
                                    border:'none', 
                                    background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
                                    color:'#fff', 
                                    fontWeight:600, 
                                    cursor:'pointer',
                                    boxShadow:'0 2px 8px rgba(34, 197, 94, 0.35)'
                                  }}
                                >
                                  Analyze
                                </button>
                              </td>
                            </tr>
                            {explainPick === r.symbol && (
                              <tr>
                                <td colSpan={6} style={{padding:'12px', background:'#f9fafb', borderTop:'1px solid #e5e7eb'}}>
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
                                      <div style={{marginBottom: 16}}>
                                        <AgentConsensus
                                          symbol={r.symbol}
                                          agents={agentVotes}
                                          consensus={consensus}
                                          consensusStrength={consensusStrength}
                                        />
                                      </div>
                                    )
                                  })()}
                                  <div style={{display:'grid', gap:12}}>
                                    <div>
                                      <div style={{fontSize:12, fontWeight:600, marginBottom:6}}>Confidence:</div>
                                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                                        <div style={{flex:1, height:8, background:'#e5e7eb', borderRadius:4, overflow:'hidden'}}>
                                          <div style={{
                                            width: `${r.score_blend}%`,
                                            height:'100%',
                                            background: getScoreColor(r.score_blend),
                                            transition: 'width 0.3s'
                                          }} />
                                        </div>
                                        <span style={{fontSize:13, fontWeight:600, color: getScoreColor(r.score_blend)}}>
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
                          <td colSpan={5} style={{padding:'8px 8px', fontWeight:600, fontSize:13, color:'#991b1b', background:'#fef2f2'}}>
                            Top Five Sell Picks
                          </td>
                        </tr>
                        {sellPicks.map((r:any, i:number)=> {
                          const score = typeof r.score_blend === 'number' ? r.score_blend : 0
                          const dir = classifyPickDirection(score, primaryMode)
                          const recommendation = dir ? dir.label : (r.recommendation || 'Sell')
                          return (
                          <React.Fragment key={`sell-${r.symbol}-${i}`}>
                            <tr>
                              <td 
                                style={{
                                  padding:'10px 8px', 
                                  fontWeight:600, 
                                  cursor:'pointer',
                                  color:'#2563eb',
                                  textDecoration:'underline',
                                  textDecorationStyle:'dotted',
                                  textDecorationColor:'#93c5fd'
                                }}
                                onClick={()=>setChartView({symbol: r.symbol, analysis: r})}
                                onMouseEnter={(e)=>{
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setTip({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 8,
                                    text: '📊 Click to view interactive chart',
                                    type: 'chart'
                                  })
                                }}
                                onMouseLeave={()=>setTip(null)}
                              >
                                {r.symbol}
                              </td>
                              <td style={{padding:'10px 8px'}}>
                                <span 
                                  style={{fontWeight:600, color:getScoreColor(r.score_blend), cursor:'pointer', fontSize:14}} 
                                  onClick={()=>setExplainPick(explainPick===r.symbol? null : r.symbol)}
                                  onMouseEnter={(e)=>{
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    setTip({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top - 8,
                                      text: '🤖 Click to see agent breakdown',
                                      type: 'score'
                                    })
                                  }}
                                  onMouseLeave={()=>setTip(null)}
                                >
                                  {r.score_blend}%
                                </span>
                              </td>
                              <td style={{padding:'10px 8px'}}>
                                <div style={{display:'flex', alignItems:'center', gap:6}}>
                                  <span style={{
                                    padding:'4px 10px',
                                    borderRadius:6,
                                    fontSize:12,
                                    fontWeight:600,
                                    whiteSpace:'nowrap',
                                    display:'inline-block',
                                    background: recommendation === 'Sell' || recommendation === 'Strong Sell' ? '#fee2e2' : '#dcfce7',
                                    color: recommendation === 'Sell' || recommendation === 'Strong Sell' ? '#991b1b' : '#166534'
                                  }}>
                                    {recommendation}
                                  </span>
                                </div>
                              </td>
                              <td 
                                style={{
                                  padding:'10px 8px', 
                                  color:'#475569', 
                                  fontSize:13,
                                  lineHeight:'1.5'
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
                                  const text = findings.length > 0 ? findings.slice(0,2).join(', ') + (findings.length > 2 ? '...' : '') : (r.rationale || 'Multi-agent analysis complete')
                                  return text.charAt(0).toUpperCase() + text.slice(1)
                                })()}
                              </td>
                              <td style={{padding:'10px 8px', textAlign:'center'}}>
                                <button 
                                  onClick={()=>onAnalyze(r)} 
                                  style={{
                                    padding:'6px 16px', 
                                    fontSize:13, 
                                    borderRadius:999, 
                                    border:'none', 
                                    background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
                                    color:'#fff', 
                                    fontWeight:600, 
                                    cursor:'pointer',
                                    boxShadow:'0 2px 8px rgba(34, 197, 94, 0.35)'
                                  }}
                                >
                                  Analyze
                                </button>
                              </td>
                            </tr>
                            {explainPick === r.symbol && (
                              <tr>
                                <td colSpan={6} style={{padding:'12px', background:'#f9fafb', borderTop:'1px solid #e5e7eb'}}>
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
                                      <div style={{marginBottom: 16}}>
                                        <AgentConsensus
                                          symbol={r.symbol}
                                          agents={agentVotes}
                                          consensus={consensus}
                                          consensusStrength={consensusStrength}
                                        />
                                      </div>
                                    )
                                  })()}
                                  <div style={{display:'grid', gap:12}}>
                                    <div>
                                      <div style={{fontSize:12, fontWeight:600, marginBottom:6}}>Confidence:</div>
                                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                                        <div style={{flex:1, height:8, background:'#e5e7eb', borderRadius:4, overflow:'hidden'}}>
                                          <div style={{
                                            width: `${r.score_blend}%`,
                                            height:'100%',
                                            background: getScoreColor(r.score_blend),
                                            transition: 'width 0.3s'
                                          }} />
                                        </div>
                                        <span style={{fontSize:13, fontWeight:600, color: getScoreColor(r.score_blend)}}>
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
                        <td colSpan={5} style={{padding:'12px 8px', fontSize:13, color:'#64748b', textAlign:'center'}}>
                          No directional Buy/Sell picks are available for this mode right now.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </section>
      )} 
        </div>
      </div>

      {/* Winning Trades Modal */}
      {showWinningTrades && (
        <div
          style={{
            position:'fixed',
            inset:0,
            background:'rgba(0,0,0,0.35)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            padding:20,
            zIndex:1001
          }}
          onClick={()=>setShowWinningTrades(false)}
        >
          <div
            style={{
              width:'min(1000px, 90vw)',
              maxHeight:'90vh',
              overflowY:'auto',
              background:'linear-gradient(135deg, #e0f2fe 0%, #ecfdf5 100%)',
              borderRadius:16,
              padding:24,
              border:'2px solid #0095FF'
            }}
            onClick={e=>e.stopPropagation()}
          >
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
              <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div>
                    <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:8}}>
                      <span style={{fontSize:32}}>🏆</span>
                      <div style={{fontWeight:700, fontSize:24, color:'#0369a1'}}>Winning Trades</div>
                    </div>
                    <div style={{fontSize:14, color:'#0f172a'}}>Track Alpha Generated Across Trading Modes</div>
                  </div>
                  {/* Live Indicator - only show LIVE when market is open */}
                  {winningTradesData?.as_of && (() => {
                    const now = new Date()
                    const day = now.getDay()
                    const isWeekday = day >= 1 && day <= 5
                    const hours = now.getHours()
                    const minutes = now.getMinutes()
                    const currentTime = hours * 60 + minutes
                    const marketOpen = 9 * 60 + 15
                    const marketClose = 15 * 60 + 30
                    const intradayWindowOpen = isWeekday && currentTime >= marketOpen && currentTime <= marketClose

                    const asOfDate = new Date(winningTradesData.as_of)
                    const isSameDay = asOfDate.toDateString() === now.toDateString()
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
                        const dateStr = asOfDate.toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })

                        if (isSameDay) {
                          return 'As of market close today'
                        }

                        return `As of market close on ${dateStr}`
                      } catch {
                        return 'As of last market close'
                      }
                    })()

                    return (
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <div style={{
                          display:'flex',
                          alignItems:'center',
                          gap:6,
                          padding:'6px 12px',
                          background: isMarketOpen ? '#dcfce7' : '#e5e7eb',
                          borderRadius:999,
                          border: isMarketOpen ? '1px solid #16a34a' : '1px solid #9ca3af'
                        }}>
                          <div style={{
                            width:8,
                            height:8,
                            borderRadius:'50%',
                            background: isMarketOpen ? '#16a34a' : '#9ca3af',
                            animation: isMarketOpen ? 'pulse 2s infinite' : 'none'
                          }}></div>
                          <span style={{
                            fontSize:11,
                            fontWeight:700,
                            color: isMarketOpen ? '#15803d' : '#4b5563'
                          }}>
                            {isMarketOpen ? 'LIVE' : 'Market Closed'}
                          </span>
                        </div>
                        <div style={{fontSize:11, color:'#78350f', fontWeight:500}}>
                          {isMarketOpen ? `Updated ${updatedLabel}` : closedLabel}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
              <button
                onClick={()=>setShowWinningTrades(false)}
                style={{border:'none', background:'transparent', fontSize:28, cursor:'pointer', color:'#92400e'}}
              >
                &times;
              </button>
            </div>

            {/* Mode Filters with Win Rate Badges */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:12, fontWeight:600, color:'#0369a1', marginBottom:8}}>TRADING MODE</div>
              <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                {['All', 'Scalping', 'Intraday', 'Swing', 'Options', 'Futures'].map(mode => {
                  const isActive = winningTradesMode === mode

                  const modeConfig =
                    mode === 'All'
                      ? null
                      : availableModes.find(m => String(m.value).toLowerCase() === mode.toLowerCase())

                  const tooltip =
                    mode === 'All'
                      ? 'Show performance across all trading modes'
                      : modeConfig?.description || `${mode} mode`

                  // Calculate win rate for this mode
                  const modeRecs = mode === 'All'
                    ? winningTradesData?.recommendations || []
                    : (winningTradesData?.recommendations || []).filter((r:any) => r.mode === mode)
                  const modeWins = modeRecs.filter((r:any) => r.return_pct > 0)
                  const modeWinRate = modeRecs.length > 0 ? Math.round((modeWins.length / modeRecs.length) * 100) : 0

                  return (
                    <button
                      key={mode}
                      onClick={()=>setWinningTradesMode(mode)}
                      onMouseEnter={(e)=>{
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTip({
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                          text: tooltip,
                          type: 'mode'
                        })
                      }}
                      onMouseLeave={()=>setTip(null)}
                      style={{
                        padding:'8px 16px',
                        fontSize:12,
                        fontWeight:600,
                        borderRadius:999,
                        border: isActive ? '2px solid #0095FF' : '1px solid rgba(15,23,42,0.15)',
                        background: isActive ? 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)' : 'rgba(255,255,255,0.7)',
                        color: isActive ? '#ffffff' : '#0f172a',
                        cursor:'pointer',
                        transition:'all 0.2s',
                        display:'flex',
                        alignItems:'center',
                        gap:6
                      }}
                    >
                      <span>{mode}</span>
                      {modeRecs.length > 0 && (
                        <span style={{
                          fontSize:10,
                          padding:'2px 6px',
                          borderRadius:999,
                          background: modeWinRate >= 80 ? '#16a34a' : modeWinRate >= 60 ? '#eab308' : '#64748b',
                          color:'#fff',
                          fontWeight:700
                        }}>
                          {modeWinRate}%
                        </span>
                      )}
                      {isActive && ' ✓'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Performance Metrics */}
            {loadingWinningTrades ? (
              <div style={{textAlign:'center', padding:40, color:'#78350f'}}>Loading performance data...</div>
            ) : winningTradesData ? (
              (() => {
                // Calculate KPIs based on current filter
                let filteredRecs = winningTradesData?.recommendations || []
                if (winningTradesMode !== 'All') {
                  filteredRecs = filteredRecs.filter((r:any) => r.mode === winningTradesMode)
                }
                if (winningTradesDate !== 'all') {
                  filteredRecs = filteredRecs.filter((r:any) => r.recommended_date === winningTradesDate)
                }

                // Calculate metrics for filtered data
                const wins = filteredRecs.filter((r:any) => r.return_pct > 0)
                const winRate = filteredRecs.length > 0 ? ((wins.length / filteredRecs.length) * 100).toFixed(1) : '0.0'
                const avgReturn = filteredRecs.length > 0
                  ? (filteredRecs.reduce((sum:number, r:any) => sum + r.return_pct, 0) / filteredRecs.length).toFixed(2)
                  : '0.00'

                // Choose benchmark: per-day when a specific date is selected, else window-level benchmark_return
                let benchmark = typeof winningTradesData?.metrics?.benchmark_return === 'number'
                  ? winningTradesData.metrics.benchmark_return
                  : 1.0
                if (winningTradesDate !== 'all') {
                  const ts = (winningTradesData as any)?.benchmark_timeseries
                  const perDay = ts && typeof ts[winningTradesDate] === 'number' ? ts[winningTradesDate] : undefined
                  if (typeof perDay === 'number') {
                    benchmark = perDay
                  }
                }

                const alphaGen = (parseFloat(avgReturn) - benchmark).toFixed(2) // vs NIFTY
                const totalPicks = filteredRecs.length
                const uniqueSymbols = new Set(filteredRecs.map((r:any) => r.symbol)).size

                return (
                  <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginBottom:24}}>
                    <div style={{background:'#dcfce7', padding:16, borderRadius:12, border:`2px solid #16a34a`}}>
                      <div style={{fontSize:12, color:'#166534', fontWeight:600, marginBottom:4}}>WIN RATE</div>
                      <div style={{fontSize:32, fontWeight:700, color:'#15803d'}}>{winRate}%</div>
                      <div style={{fontSize:11, color:'#166534'}}>{winningTradesMode === 'All' ? 'All modes' : winningTradesMode}</div>
                    </div>
                    <div style={{background:'#dbeafe', padding:16, borderRadius:12, border:`2px solid #3b82f6`}}>
                      <div style={{fontSize:12, color:'#1e40af', fontWeight:600, marginBottom:4}}>AVG RETURN</div>
                      <div style={{fontSize:20, fontWeight:700, color:'#1d4ed8', marginBottom:4}}>
                        {parseFloat(avgReturn) >= 0 ? '+' : ''}{avgReturn}%
                      </div>
                      <div style={{fontSize:11, color:'#1e40af'}}>Per recommendation</div>
                    </div>
                    <div style={{background:'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)', padding:16, borderRadius:12, border:`2px solid #0095FF`}}>
                      <div style={{fontSize:12, color:'#e0f2fe', fontWeight:600, marginBottom:4}}>ALPHA GENERATED</div>
                      <div style={{fontSize:20, fontWeight:700, color:'#ffffff', marginBottom:4}}>
                        {parseFloat(alphaGen) >= 0 ? '+' : ''}{alphaGen}%
                      </div>
                      <div style={{fontSize:11, color:'#e0f2fe'}}>vs NIFTY50</div>
                    </div>
                    <div style={{background:'#f3e8ff', padding:16, borderRadius:12, border:'2px solid #a855f7'}}>
                      <div style={{fontSize:12, color:'#6b21a8', fontWeight:600, marginBottom:4}}>TOTAL PICKS</div>
                      <div style={{fontSize:32, fontWeight:700, color:'#7c3aed'}}>{totalPicks}</div>
                      <div style={{fontSize:11, color:'#6b21a8', lineHeight:1.4}}>
                        <div>Filtered results</div>
                        <div>Unique symbols: {uniqueSymbols}</div>
                      </div>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div style={{textAlign:'center', padding:40, color:'#78350f'}}>No performance data available</div>
            )}

            {/* Top Winning Trades Table */}
            <div style={{background:'#fff', borderRadius:12, padding:16, border:'1px solid #e5e7eb'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                <div>
                  <div style={{fontWeight:600, fontSize:16}}>Top Winning Trades</div>
                  <div style={{fontSize:12, color:'#64748b'}}>Performance tracked since recommendation • Sorted by Returns • Showing All Picks</div>
                </div>
                {/* Date Filter */}
                <select
                  value={winningTradesDate}
                  onChange={(e)=>setWinningTradesDate(e.target.value)}
                  style={{
                    padding:'6px 12px',
                    fontSize:12,
                    fontWeight:600,
                    borderRadius:8,
                    border:'2px solid #e5e7eb',
                    background:'#fff',
                    color:'#64748b',
                    cursor:'pointer'
                  }}
                >
                  <option value="all">All Dates</option>
                  {winningTradesAvailableDates.map(d => {
                    try {
                      const dt = new Date(d)
                      const label = dt.toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                      return (
                        <option key={d} value={d}>{label}</option>
                      )
                    } catch {
                      return null
                    }
                  })}
                </select>
              </div>

              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid #e5e7eb'}}>
                    <th style={{textAlign:'left', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Symbol</th>
                    <th style={{textAlign:'left', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Mode</th>
                    <th style={{textAlign:'left', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Recommended</th>
                    <th style={{textAlign:'right', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Entry Price</th>
                    <th style={{textAlign:'right', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Exit / Last Price</th>
                    <th style={{textAlign:'right', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Return Profile</th>
                    <th style={{textAlign:'left', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Sentiment risk</th>
                    <th style={{textAlign:'center', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Status</th>
                    <th style={{textAlign:'center', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Days Held</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let recs = winningTradesData?.recommendations || []
                    // Filter by mode
                    if (winningTradesMode !== 'All') {
                      recs = recs.filter((r:any) => r.mode === winningTradesMode)
                    }
                    // Filter by date
                    if (winningTradesDate !== 'all') {
                      recs = recs.filter((r:any) => r.recommended_date === winningTradesDate)
                    }
                    // Sort by return_pct (highest first)
                    recs = [...recs].sort((a:any, b:any) => b.return_pct - a.return_pct)

                    return recs.map((row:any, idx:number) => {
                      const statusColor = row.status.includes('TARGET')
                        ? '#16a34a'
                        : row.status === 'STOP LOSS'
                          ? '#ef4444'
                          : row.status === 'CLOSED'
                            ? '#64748b'
                            : '#3b82f6'

                      const daysHeld = (() => {
                        try {
                          const recDate = new Date(row.recommended_date)
                          const today = new Date()

                          // Same calendar day: 0d for all modes
                          if (recDate.toDateString() === today.toDateString()) {
                            return 0
                          }

                          // Count trading days from recommendation date up to
                          // yesterday (inclusive), skipping weekends.
                          const end = new Date(today)
                          end.setDate(end.getDate() - 1)

                          let d = new Date(recDate)
                          let count = 0
                          while (d <= end) {
                            const day = d.getDay()
                            if (day >= 1 && day <= 5) {
                              count += 1
                            }
                            d.setDate(d.getDate() + 1)
                          }

                          // For scalping / intraday, keep same-session/very
                          // short holds at 0d.
                          if ((row.mode === 'Scalping' || row.mode === 'Intraday') && count <= 1) {
                            return 0
                          }

                          return Math.max(count, 0)
                        } catch {
                          return 0
                        }
                      })()

                      let newsRiskLabel: string | null = null
                      let newsRiskScore: number | null = null
                      let newsRiskColor = '#6b7280'
                      let newsRiskSummary: string | null = null
                      let newsHeadlineCount: number | null = null

                      const exitsForDate = row.recommended_date ? strategyExitsByDate[row.recommended_date] : null
                      const exitsList = exitsForDate && Array.isArray(exitsForDate.exits) ? exitsForDate.exits : []

                      if (exitsList.length > 0) {
                        const matches = exitsList.filter((e:any) => e && e.symbol === row.symbol)
                        if (matches.length > 0) {
                          let best = matches[0]
                          for (let i = 1; i < matches.length; i++) {
                            const a = best as any
                            const b = matches[i] as any
                            const ta = Date.parse(a.generated_at || '') || 0
                            const tb = Date.parse(b.generated_at || '') || 0
                            if (tb > ta) best = b
                          }

                          const level = computeSentimentRiskLevel((best as any).news_risk_score)
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
                          if (typeof headlinesCount === 'number' && Number.isFinite(headlinesCount)) {
                            newsHeadlineCount = headlinesCount
                          }
                        }
                      }

                      const recStr = String(row.recommendation || '').toLowerCase()
                      const isShortSide = recStr.includes('sell')
                      const directionLabel = isShortSide ? 'Short' : 'Long'
                      const directionBg = isShortSide ? '#fee2e2' : '#dcfce7'
                      const directionColor = isShortSide ? '#991b1b' : '#166534'
                      const directionBorder = isShortSide ? '#fecaca' : '#bbf7d0'

                      return (
                        <tr key={idx} style={{borderBottom:'1px solid #f1f5f9', background: idx < 3 ? '#fefce8' : 'transparent'}}>
                          <td style={{padding:'10px 8px', fontWeight:600}}>
                            <div>{row.symbol}</div>
                            {/* Scalping exit details */}
                            {row.mode === 'Scalping' && row.exit_reason && (
                              <div style={{fontSize:10, color:'#64748b', marginTop:4, display:'flex', alignItems:'center', gap:4}}>
                                <span>⚡</span>
                                <span>{row.exit_reason.replace(/_/g, ' ')}</span>
                                {row.exit_time && (
                                  <span style={{color:'#94a3b8'}}>
                                    @ {(() => {
                                      try {
                                        const date = new Date(row.exit_time)
                                        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                      } catch {
                                        return ''
                                      }
                                    })()}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{padding:'10px 8px', fontSize:11}}>
                            <div style={{display:'flex', flexDirection:'column', gap:4}}>
                              <span style={{
                                padding:'3px 8px',
                                borderRadius:4,
                                background:'#f3e8ff',
                                color:'#7c3aed',
                                fontWeight:600
                              }}>{row.mode || 'Swing'}</span>
                              <span
                                style={{
                                  padding:'2px 6px',
                                  borderRadius:999,
                                  fontSize:9,
                                  fontWeight:600,
                                  textTransform:'uppercase',
                                  letterSpacing:0.4,
                                  background: directionBg,
                                  color: directionColor,
                                  border:`1px solid ${directionBorder}`,
                                  alignSelf:'flex-start',
                                  whiteSpace:'nowrap',
                                }}
                              >
                                {directionLabel}
                              </span>
                            </div>
                          </td>
                          <td style={{padding:'10px 8px', fontSize:12, color:'#64748b'}}>
                            <div>{row.recommended_date}</div>
                            {row.entry_time && (
                              <div style={{fontSize:10, color:'#94a3b8', marginTop:2}}>
                                {(() => {
                                  try {
                                    const d = new Date(row.entry_time)
                                    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                  } catch {
                                    return ''
                                  }
                                })()}
                              </div>
                            )}
                          </td>
                          <td
                            style={{padding:'10px 8px', textAlign:'right', fontSize:13}}
                            title={(() => {
                              if (!row.entry_candle_time) return undefined
                              try {
                                const d = new Date(row.entry_candle_time)
                                return `Entry candle: ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                              } catch {
                                return undefined
                              }
                            })()}
                          >
                            ₹{row.entry_price}
                          </td>
                          <td style={{padding:'10px 8px', textAlign:'right', fontSize:13}}>
                            {(() => {
                              const hasExit = typeof row.exit_price === 'number' && Number.isFinite(row.exit_price)
                              const price = hasExit ? row.exit_price : row.current_price

                              if (typeof price !== 'number' || !Number.isFinite(price)) {
                                return <span style={{fontSize:12, color:'#94a3b8'}}>—</span>
                              }

                              const label = hasExit ? 'Exit price' : 'Last traded price'

                              return (
                                <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                                  <span>₹{price}</span>
                                  <span style={{fontSize:10, color:'#64748b', marginTop:2}}>{label}</span>
                                </div>
                              )
                            })()}
                          </td>
                          <td style={{textAlign:'right', padding:'10px 8px', fontSize:12}}>
                            {(() => {
                              const baseRet = typeof row.return_pct === 'number' && Number.isFinite(row.return_pct) ? row.return_pct : 0
                              const baseColor = baseRet > 0 ? '#16a34a' : baseRet < 0 ? '#ef4444' : '#64748b'

                              return (
                                <span style={{fontWeight:600, color:baseColor}}>
                                  {baseRet > 0 ? '+' : ''}{baseRet.toFixed(2)}%
                                </span>
                              )
                            })()}
                          </td>
                          <td style={{padding:'10px 8px', fontSize:11}}>
                            {newsRiskLabel && newsRiskScore != null ? (
                              <div
                                style={{display:'flex', flexDirection:'column', alignItems:'flex-start', gap:2}}
                                title={newsRiskSummary || undefined}
                              >
                                <div style={{fontSize:10, color:newsRiskColor, fontWeight:600}}>
                                  {`Sentiment - ${newsRiskLabel} based on ${newsHeadlineCount != null ? newsHeadlineCount : 1} recent headline${(newsHeadlineCount || 1) > 1 ? 's' : ''}`}
                                </div>
                              </div>
                            ) : (
                              <span style={{fontSize:10, color:'#cbd5f5'}}>—</span>
                            )}
                          </td>
                          <td style={{padding:'10px 8px', textAlign:'center'}}>
                            <span style={{
                              padding:'4px 8px',
                              borderRadius:6,
                              fontSize:10,
                              fontWeight:600,
                              background:statusColor+'20',
                              color:statusColor
                            }}>{row.status}</span>
                          </td>
                          <td style={{padding:'10px 8px', textAlign:'center', fontSize:12, fontWeight:600, color:'#64748b'}}>{daysHeld}d</td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
              {(() => {
                let recs = winningStrategiesData?.recommendations || []
                if (winningTradesMode !== 'All') recs = recs.filter((r:any) => r.mode === winningTradesMode)
                if (winningTradesDate !== 'all') recs = recs.filter((r:any) => r.recommended_date === winningTradesDate)
                if (recs.length === 0) return (
                  <div style={{textAlign:'center', padding:40, color:'#94a3b8', fontSize:14}}>
                    📋 No trades found for selected filters
                  </div>
                )
                return null
              })()}
            </div>

            {/* Mode Comparison Table */}
            {winningStrategiesData?.recommendations && winningStrategiesData.recommendations.length > 0 && (
              <div style={{marginTop:24, background:'#fff', borderRadius:12, padding:16, border:'1px solid #e5e7eb'}}>
                <div style={{fontWeight:600, fontSize:16, marginBottom:12, display:'flex', alignItems:'center', gap:8}}>
                  <span>🔄</span>
                  <span>Mode Performance Comparison</span>
                </div>
                <div style={{fontSize:12, color:'#64748b', marginBottom:16}}>Compare performance across all trading modes at a glance</div>

                <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid #e5e7eb'}}>
                      <th style={{textAlign:'left', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Mode</th>
                      <th style={{textAlign:'center', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Total Picks</th>
                      <th style={{textAlign:'center', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Win Rate</th>
                      <th style={{textAlign:'center', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Avg Return</th>
                      <th style={{textAlign:'center', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Alpha vs NIFTY</th>
                      <th style={{textAlign:'center', padding:'8px', fontSize:12, fontWeight:600, color:'#64748b'}}>Best Pick</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Scalping', 'Intraday', 'Swing', 'Options', 'Futures'].map(mode => {
                      const modeRecs = (winningStrategiesData?.recommendations || []).filter((r:any) => r.mode === mode)
                      if (modeRecs.length === 0) return null

                      const wins = modeRecs.filter((r:any) => r.return_pct > 0)
                      const winRate = ((wins.length / modeRecs.length) * 100).toFixed(1)
                      const avgReturn = (modeRecs.reduce((sum:number, r:any) => sum + r.return_pct, 0) / modeRecs.length).toFixed(2)
                      const benchmark = typeof winningStrategiesData?.metrics?.benchmark_return === 'number'
                        ? winningStrategiesData.metrics.benchmark_return
                        : 1.0
                      const alpha = (parseFloat(avgReturn) - benchmark).toFixed(2)
                      const bestPick = modeRecs.sort((a:any, b:any) => b.return_pct - a.return_pct)[0]

                      const modeColors:any = {
                        'Scalping': {bg: '#fef3c7', border: '#eab308', text: '#92400e'},
                        'Intraday': {bg: '#dbeafe', border: '#3b82f6', text: '#1e40af'},
                        'Swing': {bg: '#dcfce7', border: '#16a34a', text: '#15803d'},
                        'Options': {bg: '#f3e8ff', border: '#a855f7', text: '#7c3aed'},
                        'Futures': {bg: '#fee2e2', border: '#ef4444', text: '#991b1b'}
                      }
                      const colors = modeColors[mode] || {bg: '#f1f5f9', border: '#64748b', text: '#1e293b'}

                      return (
                        <tr key={mode} style={{borderBottom:'1px solid #f1f5f9'}}>
                          <td style={{padding:'10px 8px'}}>
                            <span style={{
                              padding:'4px 10px',
                              borderRadius:6,
                              background:colors.bg,
                              border:`1px solid ${colors.border}`,
                              color:colors.text,
                              fontSize:11,
                              fontWeight:600
                            }}>{mode}</span>
                          </td>
                          <td style={{padding:'10px 8px', textAlign:'center', fontSize:13, fontWeight:600}}>{modeRecs.length}</td>
                          <td style={{padding:'10px 8px', textAlign:'center'}}>
                            <span style={{
                              fontSize:13,
                              fontWeight:700,
                              color: parseFloat(winRate) >= 80 ? '#16a34a' : parseFloat(winRate) >= 60 ? '#eab308' : '#64748b'
                            }}>{winRate}%</span>
                          </td>
                          <td style={{padding:'10px 8px', textAlign:'center'}}>
                            <span style={{
                              fontSize:13,
                              fontWeight:700,
                              color: parseFloat(avgReturn) >= 1 ? '#16a34a' : parseFloat(avgReturn) >= 0 ? '#eab308' : '#ef4444'
                            }}>{parseFloat(avgReturn) >= 0 ? '+' : ''}{avgReturn}%</span>
                          </td>
                          <td style={{padding:'10px 8px', textAlign:'center'}}>
                            <span style={{
                              fontSize:13,
                              fontWeight:700,
                              color: parseFloat(alpha) > 0 ? '#16a34a' : parseFloat(alpha) === 0 ? '#64748b' : '#ef4444'
                            }}>{parseFloat(alpha) >= 0 ? '+' : ''}{alpha}%</span>
                          </td>
                          <td style={{padding:'10px 8px', textAlign:'center', fontSize:11}}>
                            <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                              <span style={{fontWeight:600, color:'#1e293b'}}>{bestPick.symbol}</span>
                              <span style={{fontSize:10, color: bestPick.return_pct >= 0 ? '#16a34a' : '#ef4444', fontWeight:600}}>
                                {bestPick.return_pct >= 0 ? '+' : ''}{bestPick.return_pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* How We Track Performance */}
            <div style={{marginTop:20, padding:14, background:'#eff6ff', borderRadius:10, border:'1px solid #3b82f6'}}>
              <div style={{fontSize:13, fontWeight:600, color:'#1e40af', marginBottom:8}}>📊 How We Track Performance</div>
              <div style={{fontSize:12, color:'#1e40af', lineHeight:1.6}}>
                <div>
                  • Realised return (what you see in the main Return Profile number) is computed as{' '}
                  <strong>(current price − entry price) ÷ entry price × 100%</strong>{' '}for long trades and{' '}
                  <strong>(entry price − current price) ÷ entry price × 100%</strong>{' '}for short trades.
                </div>
                <div style={{marginTop:4}}>
                  • In addition, we compute three offline backtest profiles per pick to show potential performance:
                  <div style={{marginLeft:16, marginTop:2}}>
                    <div>
                      <strong>TP1</strong> – exit at the first target or stop-loss. TP1% ≈ (price at TP1 or stop − entry) ÷ entry × 100% (direction-aware).
                    </div>
                    <div>
                      <strong>MFE</strong> – maximum favourable excursion within the backtest window. MFE% ≈ (max favourable price − entry) ÷ entry × 100% (respecting the stop-loss).
                    </div>
                    <div>
                      <strong>Ladder</strong> – partial exits at three targets. Ladder% ≈ (R1 + R2 + R3) ÷ 3, where each Rn is the return % achieved at target n (clipped at stop-loss).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RL Metrics Modal */}
      {showRlMetrics && (
        <div
          style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:1001}}
          onClick={()=>setShowRlMetrics(false)}
        >
          <div
            style={{width:'min(900px, 90vw)', maxHeight:'90vh', overflowY:'auto', background:'linear-gradient(135deg, #eef2ff 0%, #ecfeff 100%)', borderRadius:16, padding:24, border:'2px solid #4f46e5'}}
            onClick={e=>e.stopPropagation()}
          >
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
              <div>
                <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:4}}>
                  <SquareActivity size={24} color="#4f46e5" />
                  <div style={{fontWeight:700, fontSize:22, color:'#1e293b'}}>RL Exit Profiles & Bandit Metrics</div>
                </div>
                <div style={{fontSize:13, color:'#475569'}}>Monitor how the RL loop is learning per mode: trades, returns, drawdowns, win rate, and best profiles.</div>
              </div>
              <button
                onClick={()=>setShowRlMetrics(false)}
                style={{border:'none', background:'transparent', fontSize:28, cursor:'pointer', color:'#4b5563'}}
              >
                &times;
              </button>
            </div>

            {loadingRlMetrics && (
              <div style={{padding:16, textAlign:'center', color:'#1e293b', fontSize:14}}>Loading RL metrics...</div>
            )}

            {!loadingRlMetrics && rlMetricsError && (
              <div style={{padding:12, marginBottom:12, borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', fontSize:13}}>
                {rlMetricsError}
              </div>
            )}

            {!loadingRlMetrics && !rlMetricsError && (!rlMetricsData || !rlMetricsData.policy) && (
              <div style={{padding:16, fontSize:14, color:'#1e293b'}}>
                No ACTIVE RL policy or metrics found yet. The nightly RL job will populate metrics after it runs for a few sessions.
              </div>
            )}

            {!loadingRlMetrics && !rlMetricsError && rlMetricsData && rlMetricsData.policy && (
              <div style={{display:'flex', flexDirection:'column', gap:16}}>
                {/* Daily performance summary */}
                {Array.isArray(rlDailyData) && rlDailyData.length > 0 && (
                  <div style={{padding:12, borderRadius:10, background:'#f9fafb', border:'1px solid #e5e7eb'}}>
                    <div style={{fontWeight:600, fontSize:14, color:'#111827', marginBottom:6}}>
                      Recent Daily Performance (per mode)
                    </div>
                    <div style={{fontSize:11, color:'#6b7280', marginBottom:8}}>
                      One row per trade date × mode. Alpha is avg return %, drawdown is avg max drawdown %.
                    </div>
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                        <thead>
                          <tr style={{background:'#e5e7eb'}}>
                            <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #d1d5db'}}>Date</th>
                            <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #d1d5db'}}>Mode</th>
                            <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #d1d5db'}}>Trades</th>
                            <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #d1d5db'}}>Alpha %</th>
                            <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #d1d5db'}}>Drawdown %</th>
                            <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #d1d5db'}}>Win Rate %</th>
                            <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #d1d5db'}}>Hit Target %</th>
                            <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #d1d5db'}}>Hit Stop %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rlDailyData!.map((d:any, idx:number) => (
                            <tr key={idx} style={{background: idx % 2 === 0 ? '#ffffff' : '#f9fafb'}}>
                              <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb'}}>{d.date}</td>
                              <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb'}}>{d.mode}</td>
                              <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{d.trades}</td>
                              <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{d.avg_ret_close_pct.toFixed(2)}</td>
                              <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{d.avg_max_drawdown_pct.toFixed(2)}</td>
                              <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{d.win_rate.toFixed(1)}</td>
                              <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{d.hit_target_rate.toFixed(1)}</td>
                              <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{d.hit_stop_rate.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Policy summary */}
                <div style={{padding:12, borderRadius:10, background:'#e0f2fe', border:'1px solid #bae6fd'}}>
                  <div style={{fontSize:14, color:'#0f172a'}}>
                    <strong>Active Policy:</strong> {rlMetricsData.policy.name} ({rlMetricsData.policy.policy_id})
                  </div>
                  <div style={{fontSize:12, color:'#475569', marginTop:4}}>
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
                  <div style={{padding:16, fontSize:14, color:'#1e293b'}}>
                    Policy is active but no exit profile metrics have been recorded yet. Once nightly RL runs with enough data, modes will appear here.
                  </div>
                )}

                {Array.isArray(rlMetricsData.modes) && rlMetricsData.modes.map((m: any) => (
                  <div key={m.mode} style={{borderRadius:12, border:'1px solid #c7d2fe', background:'#eff6ff', padding:14}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                      <div>
                        <div style={{fontWeight:600, fontSize:15, color:'#1e293b'}}>
                          Mode: {m.mode}
                        </div>
                        <div style={{fontSize:12, color:'#475569', marginTop:2}}>
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
                      <div style={{fontSize:12, color:'#4b5563', textAlign:'right'}}>
                        <div><strong>Bandit contexts:</strong> {m.bandit?.contexts ?? 0}</div>
                        <div><strong>Bandit actions:</strong> {m.bandit?.actions ?? 0}</div>
                      </div>
                    </div>

                    {Array.isArray(m.profiles) && m.profiles.length > 0 ? (
                      <div style={{overflowX:'auto', marginTop:8}}>
                        <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                          <thead>
                            <tr style={{background:'#dbeafe'}}>
                              <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #bfdbfe'}}>Profile</th>
                              <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #bfdbfe'}}>Trades</th>
                              <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #bfdbfe'}}>Avg Return %</th>
                              <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #bfdbfe'}}>Max Drawdown %</th>
                              <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #bfdbfe'}}>Win Rate %</th>
                              <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #bfdbfe'}}>Hit Target %</th>
                              <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #bfdbfe'}}>Hit Stop %</th>
                              <th style={{textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #bfdbfe'}}>Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.profiles.map((p: any) => {
                              const isBest = !!p.is_best
                              return (
                                <tr key={p.id} style={{background: isBest ? '#fef9c3' : 'transparent'}}>
                                  <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', fontWeight: isBest ? 600 : 400}}>
                                    {p.id}
                                    {isBest && <span style={{marginLeft:6, fontSize:11, color:'#92400e'}}>BEST</span>}
                                  </td>
                                  <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{p.trades}</td>
                                  <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{p.avg_ret_close_pct.toFixed(2)}</td>
                                  <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{p.avg_max_drawdown_pct.toFixed(2)}</td>
                                  <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{p.win_rate.toFixed(1)}</td>
                                  <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{p.hit_target_rate.toFixed(1)}</td>
                                  <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{p.hit_stop_rate.toFixed(1)}</td>
                                  <td style={{padding:'6px 8px', borderBottom:'1px solid #e5e7eb', textAlign:'right'}}>{p.score.toFixed(2)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{marginTop:8, fontSize:12, color:'#6b7280'}}>
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

      {/* Chart View Modal */}
      {chartView && (
        <ChartView
          symbol={chartView.symbol}
          analysis={chartView.analysis}
          onClose={() => setChartView(null)}
          livePrice={livePrices[chartView.symbol]}
          onSubscribeSymbols={subscribeSymbols}
          onUnsubscribeSymbols={unsubscribeSymbols}
        />
      )}

      {/* Trading Preferences Modal */}
      {prefsOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:1000}} onClick={()=>setPrefsOpen(false)}>
          <div style={{width:'min(600px, 90vw)', maxHeight:'90vh', overflowY:'auto', background:'#fff', borderRadius:16, padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
              <div>
                <div style={{fontWeight:700, fontSize:22, color:'#1e293b', marginBottom:4}}>⚙️ Trading Preferences</div>
                <div style={{fontSize:13, color:'#64748b'}}>Customize your trading strategy and risk profile</div>
              </div>
              <button onClick={()=>setPrefsOpen(false)} style={{border:'none', background:'transparent', fontSize:28, cursor:'pointer', color:'#64748b'}}>&times;</button>
            </div>

            {/* Risk Profile */}
            <div style={{marginBottom:28}}>
              <div style={{fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:12}}>Risk Profile</div>
              <div style={{display:'flex', gap:12}}>
                {(['Conservative', 'Moderate', 'Aggressive'] as const).map(r => (
                  <button
                    key={r}
                    onClick={()=>{setRisk(r); try{localStorage.setItem('arise_risk', r)}catch{}}}
                    style={{
                      flex:1,
                      padding:'12px',
                      borderRadius:10,
                      border: risk===r ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      background: risk===r ? '#eff6ff' : '#fff',
                      cursor:'pointer',
                      fontSize:13,
                      fontWeight:600,
                      color: risk===r ? '#1e40af' : '#64748b',
                      transition:'all 0.2s'
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Trading Mode */}
            <div style={{marginBottom:28}}>
              <div style={{fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:8}}>
                Primary Trading Mode <span style={{fontSize:11, fontWeight:400, color:'#ef4444'}}>*Required</span>
              </div>
              <div style={{fontSize:12, color:'#64748b', marginBottom:12}}>
                Select ONE primary mode for focused strategy generation. This determines your trade horizon and targets.
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                {availableModes
                  .filter(mode => mode.value !== 'Commodity')
                  .map(mode => (
                  <label key={mode.value} style={{
                    display:'flex',
                    alignItems:'start',
                    padding:12,
                    border: primaryMode===mode.value ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius:10,
                    background: primaryMode===mode.value ? '#eff6ff' : '#f9fafb',
                    cursor:'pointer',
                    transition:'all 0.2s'
                  }}>
                    <input
                      type="radio"
                      name="primary_mode"
                      value={mode.value}
                      checked={primaryMode === mode.value}
                      onChange={(e) => {
                        setPrimaryMode(e.target.value)
                        // Remove from auxiliary if was there
                        setAuxiliaryModes(aux => aux.filter(m => m !== e.target.value))
                        try{localStorage.setItem('arise_primary_mode', e.target.value)}catch{}
                      }}
                      style={{marginTop:2, marginRight:10}}
                    />
                    <div style={{flex:1}}>
                      <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                        <span style={{fontSize:18}}>{mode.icon}</span>
                        <span style={{fontWeight:600, fontSize:14, color:'#1e293b'}}>{mode.display_name}</span>
                        <span style={{fontSize:11, color:'#64748b'}}>({mode.horizon})</span>
                      </div>
                      <div style={{fontSize:12, color:'#64748b', lineHeight:1.5}}>{mode.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Auxiliary Modes */}
            <div style={{marginBottom:28}}>
              <div style={{fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:8}}>
                Auxiliary Modes <span style={{fontSize:11, fontWeight:400, color:'#64748b'}}>Optional (max 2)</span>
              </div>
              <div style={{fontSize:12, color:'#64748b', marginBottom:12}}>
                Add slight influence from other trading styles to fine-tune agent weights.
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {availableModes
                  .filter(mode => mode.value !== primaryMode && mode.value !== 'Commodity')
                  .map(mode => (
                    <label key={mode.value} style={{
                      display:'flex',
                      alignItems:'center',
                      padding:10,
                      border:'1px solid #e5e7eb',
                      borderRadius:8,
                      background: auxiliaryModes.includes(mode.value) ? '#f0fdf4' : '#f9fafb',
                      opacity: auxiliaryModes.length >= 2 && !auxiliaryModes.includes(mode.value) ? 0.5 : 1,
                      cursor: auxiliaryModes.length >= 2 && !auxiliaryModes.includes(mode.value) ? 'not-allowed' : 'pointer',
                      transition:'all 0.2s'
                    }}>
                      <input
                        type="checkbox"
                        checked={auxiliaryModes.includes(mode.value)}
                        disabled={auxiliaryModes.length >= 2 && !auxiliaryModes.includes(mode.value)}
                        onChange={(e) => {
                          const updated = e.target.checked ? 
                            [...auxiliaryModes, mode.value] : 
                            auxiliaryModes.filter(m => m !== mode.value)
                          setAuxiliaryModes(updated)
                          try{localStorage.setItem('arise_auxiliary_modes', JSON.stringify(updated))}catch{}
                        }}
                        style={{marginRight:10}}
                      />
                      <span style={{fontSize:16, marginRight:8}}>{mode.icon}</span>
                      <span style={{fontSize:13, fontWeight:500, color:'#1e293b'}}>{mode.display_name}</span>
                    </label>
                  ))
                }
              </div>
              {auxiliaryModes.length >= 2 && (
                <div style={{
                  marginTop:10,
                  padding:'8px 12px',
                  background:'#fef3c7',
                  border:'1px solid #fcd34d',
                  borderRadius:6,
                  fontSize:11,
                  color:'#92400e'
                }}>
                  ⚠️ Maximum 2 auxiliary modes. Uncheck one to add another.
                </div>
              )}
            </div>

            {/* Save Button */}
            <div style={{display:'flex', gap:12}}>
              <button
                onClick={async ()=>{
                  try {
                    // Sync with backend
                    await updateMemory({
                      session_id: 'local',
                      data: {
                        risk,
                        primary_mode: primaryMode,
                        auxiliary_modes: auxiliaryModes
                      }
                    })
                    setPrefsOpen(false)
                    // Refresh picks if they're showing
                    if (showPicks) {
                      onFetchPicks()
                    }
                  } catch (err) {
                    console.error('Failed to save preferences:', err)
                    alert('Failed to save preferences. Please try again.')
                  }
                }}
                style={{
                  flex:1,
                  padding:'10px 20px',
                  borderRadius:10,
                  background:'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color:'#fff',
                  fontSize:14,
                  fontWeight:600,
                  cursor:'pointer',
                  boxShadow:'0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
              >
                ✓ Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

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
        } catch {}

        const isChart = tip.type === 'chart'
        const isScore = tip.type === 'score'
        const isMode = tip.type === 'mode'

        return (
        <div style={{
          position:'fixed',
          left:x,
          top:y,
          transform:'translate(-50%, -100%)',
          background: isChart
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : isScore
            ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            : isMode
            ? '#0f172a'
            : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: isMode ? '#e5e7eb' : '#fff',
          padding: isMode ? '10px 14px' : '8px 14px',
          borderRadius:8,
          fontSize: isMode ? 11 : 12,
          fontWeight:600,
          whiteSpace: isMode ? 'normal' : 'nowrap',
          maxWidth: isMode ? 260 : undefined,
          lineHeight: isMode ? 1.4 : 1.2,
          pointerEvents:'none',
          zIndex:9999,
          boxShadow:'0 8px 20px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)',
          border:'2px solid rgba(255,255,255,0.3)',
          backdropFilter:'blur(8px)',
          animation:'tooltipFadeIn 0.2s ease-out'
        }}>
          {tip.text}
          {/* Tooltip Arrow */}
          <div style={{
            position:'absolute',
            bottom:-6,
            left:'50%',
            transform:'translateX(-50%)',
            width:0,
            height:0,
            borderLeft:'6px solid transparent',
            borderRight:'6px solid transparent',
            borderTop: isChart
              ? '6px solid #764ba2'
              : isScore
              ? '6px solid #f5576c'
              : isMode
              ? '6px solid #0f172a'
              : '6px solid #00f2fe'
          }} />
        </div>
        )})()}
      
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

      {/* Subtle FYNTRIX watermark */}
      <div
        style={{
          position:'fixed',
          right:6,
          bottom:4,
          fontSize:9,
          color:'#9ca3af',
          opacity:0.45,
          pointerEvents:'none',
          userSelect:'none',
          zIndex:5,
          display:'flex',
          alignItems:'center',
          gap:4,
        }}
      >
        <FyntrixLogo fontSize={9} fontWeight={700} />
        <span>· Licensed to {BRANDING.licensee}</span>
      </div>

    </div>
  )
}
