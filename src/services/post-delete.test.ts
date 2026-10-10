import {beforeEach,it,expect,vi} from 'vitest';
import type {Post} from '../types';
const mock=vi.hoisted(()=>({rows:vi.fn(),remove:vi.fn()}));
vi.mock('./client',()=>({supabase:{from:()=>({delete:()=>({eq:()=>({select:mock.rows})})}),storage:{from:()=>({remove:mock.remove})}}}));
import {deletePost} from './photos';
beforeEach(()=>vi.resetAllMocks());
const post={id:'post',image_path:'owner/post.jpg'} as Post;
it('never deletes the file when the database rejects post deletion',async()=>{
 mock.rows.mockResolvedValue({data:[],error:null});
 await expect(deletePost(post)).rejects.toThrow();
 expect(mock.remove).not.toHaveBeenCalled();
});
it('deletes the row before the file and reports failed file cleanup without undoing deletion',async()=>{
 mock.rows.mockResolvedValue({data:[{id:'post'}],error:null});
 mock.remove.mockRejectedValue(new Error('network'));
 expect(await deletePost(post)).toBe(false);
 expect(mock.remove).toHaveBeenCalledWith(['owner/post.jpg']);
 expect(mock.rows.mock.invocationCallOrder[0]).toBeLessThan(mock.remove.mock.invocationCallOrder[0]);
});
