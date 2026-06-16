import { CLUB_ASSET_BASE_URL } from "./site-config";

export { CLUB_ASSET_BASE_URL };

function clubAsset(fileName: string) {
  return `${CLUB_ASSET_BASE_URL}/${fileName}`;
}

export const CLUB_ASSETS = {
  amdSponsorTeamPhoto: clubAsset("amd-sponsor-team-photo.jpg"),
  bitcampTeamPhoto: clubAsset("bitcamp-team-photo.webp"),
  clubGbmAudience: clubAsset("club-gbm-audience.webp"),
  clubCommunityEvent: clubAsset("club-community-event.jpg"),
  clubMemberTrio: clubAsset("club-member-trio.webp"),
  clubMembersGathering: clubAsset("club-members-gathering.jpg"),
  clubTeamWaterfrontGroup: clubAsset("club-team-waterfront-group.jpg"),
  devTeamPic: clubAsset("devTeamPic.webp"),
  eventsExpoFloor: clubAsset("events-expo-floor.jpg"),
  gameDevKnightsTabling: clubAsset("game-dev-knights-tabling.jpg"),
  hackathonAwardWinners: clubAsset("hackathon-award-winners.jpg"),
  hackathonBloomKnights: clubAsset("EventBannerBloom.png"),
  hackathonFloorGathering: clubAsset("hackathon-floor-gathering.jpg"),
  hackathonGemiKnights: clubAsset("gemiknights.webp"),
  hackathonHackADayI: clubAsset("hack-a-day-i.webp"),
  hackathonHackADayII: clubAsset("hack-a-day-ii.webp"),
  hackathonKnightHacksI: clubAsset("knight-hacks-i.webp"),
  hackathonKnightHacksII: clubAsset("knight-hacks-ii.webp"),
  hackathonKnightHacksIII: clubAsset("knight-hacks-iii.webp"),
  hackathonKnightHacksIV: clubAsset("knight-hacks-iv.webp"),
  hackathonKnightHacksV: clubAsset("knight-hacks-v.webp"),
  hackathonKnightHacksVI: clubAsset("knight-hacks-vi.webp"),
  hackathonKnightHacksVII: clubAsset("knight-hacks-vii.webp"),
  hackathonKnightHacksVIII: clubAsset("knight-hacks-viii.webp"),
  hackathonKnightHacksIX: clubAsset("IXSEO.webp"),
  hackathonMainRoom: clubAsset("hackathon-main-room.jpg"),
  hackathonMorganAndMorgan: clubAsset("morgan-and-morgan-hackathon.webp"),
  hackathonPrizeWinnersGroup: clubAsset("hackathon-prize-winners-group.jpg"),
  hackathonVolunteersFoodService: clubAsset(
    "hackathon-volunteers-food-service.jpg",
  ),
  kickstartWorkshopSession: clubAsset("kickstart-workshop-session.jpg"),
  knightHacksSetsYouApart: clubAsset("knight-hacks-sets-you-apart.webp"),
  memberNetworkingSession: clubAsset("member-networking-session.jpg"),
  projectCollaboration: clubAsset("project-collaboration.jpg"),
  projectLaunchExpoFloor: clubAsset("project-launch-expo-floor.webp"),
  projectLaunchPresentations: clubAsset("project-launch-presentations.jpg"),
  serviceNowSponsorPegasus: clubAsset("servicenow-sponsor-pegasus.jpg"),
  sponsorSessionStudents: clubAsset("sponsor-session-students.jpg"),
  tklenny: clubAsset("tklenny.png"),
  ucfPegasusMascotStudents: clubAsset("ucf-pegasus-mascot-students.jpg"),
} as const;
