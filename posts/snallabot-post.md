---
title: "What one horrible game and awful company does to a person"
date: "2024-01-12"
subtitle: "Reverse engineering Madden API's and exposing vulnerabilities in EA"
---

I have been playing Madden for basically my entire life. I think every Madden player remembers their first Madden. Mine was Madden 2003, and I remember being with my dad in this GameStop, and asking him to buy a used copy of Madden03 for $3 as it was old for whatever year that was (2006? maybe I was in 1st grade?). I was surprised he said yes, but looking back $3 was nothing for any game lol. I remember only being able to play as the Patriots against those random European teams (they had the European teams back then, they had a lot of stuff back then that the current game does not...). While I did not play every version since then, I took a huge break between Madden 15 to Madden 22, I have been back on my bs and playing it at full swing with the latest releases. I cannot express this enough: this. game. is. not. good. It is also the only viable football game out there right now (can maximum save us?). Soon after picking it back up, I started joining franchise leagues and getting involved a lot in some of them in Discord. This is where the problem starts.
<br/><br/>
Side note: this article was supposed to contain a lot of images and descriptions. However, I got lazy and wanted to just get this out there so I am going to release it with basically whatever I can in one sitting. I will try to come back and add some pictures but who knows how long that will take me. Also I was going to censor EA and Madden because I got scared of them getting mad at me, but you know what fuck it, just ban me if it really comes down to it. Free me from your shackles EA.

# EA does not care about this

Franchise is my favorite mode, I barely touch the other modes. It does not even matter if you know what it is, all that matters is that EA cares very little about this mode (especially compared to Ultimate Team, their cash cow). This mode simulates you being a coach/owner/manager of an NFL team, and so we usually get 32 people to play each team and run a league over the course of the entire year from when the game is released to when the next one is. You can imagine this takes a lot of coordination and managing, so running these leagues do take time but it is pretty fun overall. Here is where the issues start.


## Integrations with Discord

When running these leagues, an essential part is knowing information about your league when you are not actually on the game. Looking at player ratings, player stats, team stats, and schedules are all accessible in the game itself, but are also basic needs in Discord so that you can manage your league without always being on your console. Madden does not provide any APIs for developers to get this information. They provide an app, the Madden Companion App, that provides a page where you can provide a link that will export your current league data. The app will send the data to that URL, in a completely undocumented way!!! Just through sheer force of will, people have figured out all the routes you need and the structure of the input data. None of it is documented by EA in any capacity...  This is the single point of entry for any developer, and they did not even tell us how to use it. To put it simply, this app sucks. It used to suck more tbh as they updated it this year to make it a better experience, but it still sucks! Here are all the issues past and present (I will note the ones that have been fixed or have been removed, because we have to be honest on what is good) that are just straight from my memory:

* [Bug in M22, M23 (>2 years). Fixed in M24] Unable to copy and paste URLs into the export field. They expect you to manually type... a url... and if you have typos it won't work so good luck
* [Bug in M24] Older versions of this app used to have an "All Weeks" option so it would export every week of the season. It was removed in M24, and so you have to manually export all 22 weeks of the season yourself... They then added it back, buuut it does not actually work!! They added the option but it does not export all weeks. Super frustrating that they added something that is completely broken. Did they even try it?
* [Bug in M24] All admin options do not work. I believe this is because they let all users have admin access so then they just turned it off for everyone. Comical really, but you cant do any admin action in the app though all the buttons are there. You click them and you just get errors. Sweet.
* [Bug in M24] Unable to get Free Agents. They broke part of their import and it fails to retrieve free agents (it does export with an error message that it can't retrieve free agents tho lol). More on this later (I fixed it!)
* [Bug in M22, M23. maybe fixed in M24] Unable to use Let's Encrypt certificate (very popular, and free) for SSL?? I have a feeling I know why, but who really knows.
* [Never Fixed] ID's change. Sometimes the ID's Madden assigns for teams and players change.. Why?? It causes most bots to break and have to reset them because IDs are important, and should not have to change. This is not really an app issue, its just a Madden issue but I am grouping it in here because it is part of the developer experience.
* [Never Fixed] There are also various stats and such that are just not exported. Important ones like tackles for loss are not exported.
These issues make any app using the data from this extremely difficult. At my actual job, I work on really hard problems all the time. However, the most frustrating problems I have ever worked on have been related to using these APIs and understanding EA. They have continually let us out to starve and fend for ourselves when all we want to do is play some online football with friends.
<br/><br/>
With that in mind, there are some REALLY good solutions that exist right now that handle so much of this BS and I commend those developers for sticking to it. I am going to shoutout MyMadden because the dev was really nice to me! If you are looking for an all in one solution, hit them up

# The Journey: Reverse Engineering

Back in 2021 (I think?), I created my first version of my bot, snallabot (its free for those who don't want to pay like me), using these APIs. I was just doing it so the league I ran could use something as we did not really know about the other solutions that existed (they also did not have the functionality my bot provided back then, they mostly do now tho!). In doing so, I saw the Madden Companion App and had one thought: "how is this app getting the data I need? I should just do that". I hated using that damn app, so that is when I started my journey. To start, I had zero idea how to do anything. I just knew some fundamentals on how stuff worked (I found out my fundamentals were not as sturdy as I originally thought), and just assumed it would be possible. I was entering a world of hurt.

## The First Step: Man in the Middle (MITM)

With some intuition, I knew that the Madden Companion App (MCA) had to be making some sort of API call to Madden servers to receive its data. This was in fact correct. However, I had no idea how to get all the information I needed to make these calls myself. I needed to know the: servers to make the call to, the api endpoints to hit, and the requests to make to those endpoints. If you are in a browser, you can sometimes see this type of information easily through the network tab in your browsers debugging tools. I needed a way to do this but from a mobile app. That is when I found [mitmproxy](https://mitmproxy.org/).

### Solution 1: MITM Proxy

[mitmproxy](https://mitmproxy.org/) is a fantastic tool! It creates a proxy layer that route all a devices' requests through so you can see all the network calls being made, both HTTP and HTTPS. It has great instructions on how to setup certificates properly to make sure you can see HTTPS traffic as that is TLS encrypted. I thought I struck gold, I felt GREAT when I found this tool. I quickly set it up, connected my phone to the proxy, downloaded and trusted the certificates. I opened the MCA and was excited to see what I could find. While logging in, I saw everything I needed to see! I was seeing the calls to EA servers to log into my EA account, to the Sony servers as I was logging in via my playstation account. I thought this would be it, an easy task to do all this from my own server. However, that is as far as I would be able to get. Once I logged in, the app would not show me any more information. It kept complaining that it could not retrieve data from EA servers and I could not see any requests coming through, and I was missing the most vital part: my madden leagues! hmmm, I was pretty confused at the time, it should be working?? It worked without the proxy so I knew it had to be something with the proxy. I thought maybe it was an IPhone thing (pesky Apple, care less about security?). I spun up an Android emulator on my computer and tried again. I ran into the same issue, and I came to the same realization that I come to often when programming, no free lunches.

### Problem 1: Certificate Pinning

I applaud EA a bit, they knew someone like me would come along and try to do this if they released this app. So they had some security measures in place. This one was a common way to thwart MITM attacks like I was doing. In short, they pinned the TLS certificate they were using in the MCA app to make their requests so my MITM proxy could not actually decrypt any of the network requests because it was not using the MITM TLS certificate! I don't really want to get into the specifics of TLS. I am also not a great authority for most of this stuff, but the problem is described [here in MITM Proxy's docs](https://docs.mitmproxy.org/stable/concepts-certificates/#certificate-pinning). EA put their own metaphorical lock on their requests so someone like me could not easily see what was inside.
<br/><br/>
I was stumped here for some time, maybe an entire year of on and off trying random stuff that did not work. I thought this was a dead end tbh, so I started decompling the MCA APK (android package) and seeing what was inside. I found some useful stuff:

* EA had configuration files that had properties like server urls for their APIs and such. Its not very useful to know server URLs if you don't know the APIs to call or the requests to make though. Funny enough, in later versions of the app these properties were removed and this comment was left: "Be Careful with what you are putting here as this is visible outside the code!" Were they on to me?
* I was hoping that the app was all in Java/Android so I could see more in the decompiled APK. However, it was not. It was using something called Haxe and this was all C++ code. So their app was almost entirely in C++ binaries, which means decompiling those meant looking straight into assembly... yikes. I spent hours looking at that assembly and made almost 0 progress. This skill did turn out to be useful tho!

### Solution 2: Unpin the certificate

Finally though, I made my first of two major breakthroughs. After messing with the assembly for some time, I went back to the certificate pinning issue. Conceptually, I just needed to unpin the certificate that was being used and replace it with the MITM certificate. That is when the solution seemed so easy. I bet if I knew what I was doing I could have done this the first day! I decompiled the APK, looked into the resources folder and behold the EA certificate that was being used for their pinning. I replaced that with the MITM certificate, recompiled the APK, and installed it on my emulator and viola! We were now looking at all requests made from the app!!!

![MITM photo](/6/mca_cracked.png)

Just like that, I thought I was ready to replicate everything. Almost an entire year on and off, and the solution was actually quite simple in the end. I started coding immediately, and made all the calls to EA from my own server. I was able to log in successfully, pull my EA persona, and was about to make calls to the Madden server before I realized we would hit our next biggest hurdle...

### Solution 2.5: The easiest way to solve Certificate Pinning

Before I get into this next part, I took so long to do this whole operation that it actually got easier over time. In the latest version of the MCA for Madden 24, EA rewrote the entire app. They did not use Haxe anymore and switched to Apache Cordova!! This meant the entire app was in Javascript, which was WAY easier to decompile and look into the code. Another big change, was in this rewrite they removed their certificate pinning completely. So if you are trying to replicate this now, you won't even need to do what I did LOL, just by using MITM proxy you will see all the requests you need to see. However, this won't be enough as there was still a relatively complex task ahead.

### Problem 2: Message Encryption/Authentication

I started what I thought (foolishly?) was an easy task to replicate the entire process the MCA was doing. While it was a bit annoying, the login API calls were relatively easy. There were just many calls to make and many different tokens to keep track of. Once you login, you receive this session called a Blaze Session that will be used to retrieve Madden data from EA's Blaze Servers (what is blaze? someone from EA come chime in). This is when it got tricky... Every message sent to the blaze servers had an interesting field: MessageAuth. This field had two base64 encoded fields: authData and authCode. It was entirely unobvious how these fields were created, and they changed on every request! Even if the request was the same!! My initial assumption was that these fields were contrived from the rest of the data in the request, kind of like a checksum. But the fact that they changed, even if the request was the same as previous one, suggested that there was something deeper. Unfortunately, nothing could be guessed based on looking at the data alone as it was complete gibberish in bytes form. I thought EA had me, was I willing to figure out how they made this field?

```
{
  "messageAuthData": {
    "authData": "8Pmm23AvHZGjYmXbAfo/D3k96FQ5ax+qpn9c1HzDOSQvQvI1Jy8cgLNjacsx0i9MYTXmNWlhD5+nX2iaf696WW8z8iUyOxM=",
    "authType": 17039362,
    "authCode": "fnJ19Qx5dPtMOLLtEVhHZA=="
  }
}
```

Yes I was. I dove back into the assembly code to figure out how these fields were computed. This was an extremely difficult task when the app was in Haxe, as everything was in assembly and was very difficult to find the information I was looking for. However, now the app was in Javascript right! I should just be able to decompile and look at the Javascript? I excitedly started digging. Life was so much easier, the JS was so much easier to work with. Just had to put it through a prettier and it was almost like reading normal code. However, EA was again one step ahead... Everything was in Javascript, except the encryption code. They had ONE single C++ library now. It seems like this entire library was just to do the message encryption. All my excitement was gone because I realized I had to step back into what I thought I left behind: assembly code.


### Solution 3: Ghidra

I didn't talk before how I looked at the assembly code. I think if you are a pro reverse engineer you usually use tools like IDA. These can cost money depending on what you are doing, and I had no idea what I was doing. There is one pretty great free solution called [Ghidra](https://ghidra-sre.org/). It has an old school look to it, but it works fantastic. It is completely open source too! It's maintained by the National Security Agency... The NSA... The NSA has an open source decompiler they use for reverse engineering?!?! That was my first thought when I found this tool LOL. It works great however so lets use it!
<br/><br/>
Once you boot up Ghidra, you just stick the lib file in and let it go to work. The decompling and analysis can take some time, so just let it sit for a while, but its definitely working. Ghidra has a pretty great default UI and it shows you C code that it tried to translate for you so you don't have to look straight at assembly. I usually look at the C code as I find that to be the only part I actually understand, but you have to be really careful because it can just be simply wrong and in the end the assembly is the truth.

![Ghidra photo](/6/ghidra.png)

Reading the disassembly can get you pretty far! Almost all of the encryption is relatively easy to figure out. There was one step that I was stuck on and I had the help of one more tool to get me to the finish line

### Solution 4: Frida

Just looking at assembly is fine, but it can be really hard to figure out what is going on just from assembly. It is like debugging code without being able to run it and use a debugger or logging statements. What I needed and what helped me a lot was looking at live data. I wanted to look at what data was being encrypted and what was the output. There was one tool that let me do all that (and much more if you know what you are doing) and that was [Frida](https://frida.re/). I don't think I can properly describe how powerful this tool is and what it can do. I did such simple things with it and it's honestly so impressive. Frida lets you dynamically inject code into native apps. This means with a few lines of Javascript, you can run your own code as the app is running. This is extremely useful for adding instrumentation to code that you do not have!
<br/><br/>
Using Frida, I was able to see exactly what data was being passed from various function calls and see what was the output. This made it easy to make the final step and figure out exactly how EA was encrypting their messages. There was no actual encryption, it was just security by obfuscation. Nice try EA! That only goes so far. Using various hashes and some "secret" keys (static data LOL) they scramble the data using XOR. To keep the data different, they had a counter that they would increment on every request, so that is why the same request would have different authentication data!

# Integrating with Snallabot

Finally, I had every step I needed to connect to EA servers myself. There was nothing missing I had figured out every detail at this point! I thought this would be the easiest part, recreating this entire workflow in my own bot. As the saying goes, the last 20% of a project is 80% of the work. I feel like everyday I am met with the reality of this statement. Even though I successfully reverse engineered everything, I had to write more than 1000 lines of code to integrate this fully. Here are some highlights of issues I found and had to fix:

* While implementing, I looked into why EA does not return Free Agents in their data. They had a flag in their request that said `returnFreeAgent`. Well, they made a typo! This flag should say `returnFreeAgents` with an `s` at the end LMAO. This bug is still not fixed to the day of this writing, and I fixed it in my bot just by guessing how they messed up. A one character fix!
* EA uses various tokens in their app to keep the sessions fresh. However, the app kept signing me out. I thought this would be a dealbreaker because I would have to have my bot sign in to EA every so often to refresh its token. However, when I started implementing I found that EA did implement a refreshToken API and they were calling it, but each call would return a 404. I looked into it and this was because that API expected form delimited data, which is delimited like so `key1=value1&key2=value2&key3=value3`. EA was sending them... JSON! I properly send form data and I was able to successfully refresh my tokens without having to sign into EA again. How do you mess up sending data to your own APIs? How do you let this go to customers??
* When calling their Blaze Servers, I ran into some weird Javascript Fetch issues. The issue manifested with this error `ERR_SSL_UNSAFE_LEGACY_RENEGOTIATION_DISABLED`. This is because EA uses old TLS version that Node 17 by default cannot connect to that version. This is honestly pretty bad security practice for EA to be on this old SSL version. It is not my problem! I found various fixes on stack overflow and was able to turn on a flag to allow Node to connect to the blaze servers.
<br/>
These really showed some serious problems with how EA released this app, and how little they care about it working. My two cents is that the release of this was extremely rushed, and there was little to no testing done at all. Seriously, these were mind boggling mistakes to find as even using the app would expose most of them...

# Final result

I have created my own dashboard with this data, [here is an example of what it looks like](https://nallapareddy.com/snallabot/?league=972269092440530994). I recreated all the functionality I needed and it is used by 40 leagues at the time of this writing! If you would like to give it a try, you can find all the information about my [bot here](https://github.com/snallapa/snallabot). This whole endeavor took me close to 2 years, and I am so excited that I was able to get it done. 
<br/><br/>
Your turn EA, let's see how long it takes for you to break this and how long it takes for me now to figure it out again.

![Snallabot Dashboard](/6/snallabot.png)