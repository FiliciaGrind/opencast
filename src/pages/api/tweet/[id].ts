import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { tweetConverter, TweetResponse } from '../../../lib/types/tweet';
import { userConverter } from '../../../lib/types/user';
import { serialize } from '../../../lib/utils';

type TweetEndpointQuery = {
  id: string;
};

export default async function tweetIdEndpoint(
  req: NextApiRequest,
  res: NextApiResponse<TweetResponse>
): Promise<void> {
  const { id } = req.query as TweetEndpointQuery;

  const tweet = await prisma.casts.findUnique({
    where: {
      hash: Buffer.from(id, 'hex')
    }
  });

  if (!tweet) {
    res.status(404).json({
      message: 'Tweet not found'
    });
    return;
  }

  const userData = await prisma.user_data.findMany({
    where: {
      fid: tweet.fid
    }
  });

  // Create a map of fid to user data
  const userDataMap = userData.reduce((acc: any, cur) => {
    const key = cur.fid.toString();
    if (acc[key]) {
      acc[key] = {
        ...acc[key],
        [cur.type]: cur.value
      };
    } else {
      acc[key] = {
        [cur.type]: cur.value
      };
    }
    return acc;
  }, {});

  const users = Object.keys(userDataMap).map((fid) => {
    const user = userDataMap[fid];
    return userConverter.toUser({ ...user, fid });
  });

  res.json({
    result: serialize({
      ...tweetConverter.toTweet(tweet),
      user: users[0]
    })
  });
}
